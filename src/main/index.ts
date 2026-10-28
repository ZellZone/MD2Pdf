import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { join, dirname, basename, extname } from 'path'
import { readFile, writeFile, mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'MD2Pdf',
    backgroundColor: '#f4f1ea',
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  const menu = Menu.buildFromTemplate([
    {
      label: '檔案',
      submenu: [
        {
          label: '開啟 Markdown…',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:open')
        },
        {
          label: '儲存',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu:save')
        },
        { type: 'separator' },
        {
          label: '匯出 PDF…',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu:export')
        },
        {
          label: '匯出 Word…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow.webContents.send('menu:exportDocx')
        },
        { type: 'separator' },
        { role: 'quit', label: '結束' }
      ]
    },
    {
      label: '編輯',
      submenu: [
        { role: 'undo', label: '復原' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪下' },
        { role: 'copy', label: '複製' },
        { role: 'paste', label: '貼上' },
        { role: 'selectAll', label: '全選' }
      ]
    },
    {
      label: '檢視',
      submenu: [
        { role: 'reload', label: '重新載入' },
        { role: 'toggleDevTools', label: '開發者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '實際大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '縮小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全螢幕' }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    title: '開啟 Markdown 檔案',
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'mdown'] },
      { name: '所有檔案', extensions: ['*'] }
    ],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const filePath = result.filePaths[0]
  const content = await readFile(filePath, 'utf-8')
  return { filePath, content, fileName: basename(filePath) }
})

ipcMain.handle('file:save', async (_event, filePath: string, content: string) => {
  await writeFile(filePath, content, 'utf-8')
  return { filePath, fileName: basename(filePath) }
})

ipcMain.handle('dialog:saveFile', async (_event, content: string, suggestedName?: string) => {
  const result = await dialog.showSaveDialog({
    title: '儲存 Markdown',
    defaultPath: suggestedName || 'untitled.md',
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })

  if (result.canceled || !result.filePath) {
    return null
  }

  await writeFile(result.filePath, content, 'utf-8')
  return { filePath: result.filePath, fileName: basename(result.filePath) }
})

ipcMain.handle('pdf:export', async (_event, html: string, suggestedName?: string) => {
  const result = await dialog.showSaveDialog({
    title: '匯出 PDF',
    defaultPath: suggestedName
      ? suggestedName.replace(extname(suggestedName), '.pdf')
      : 'document.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })

  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'md2pdf-'))
  const htmlPath = join(tempDir, 'export.html')
  await writeFile(htmlPath, html, 'utf-8')

  const pdfWindow = new BrowserWindow({
    show: false,
    width: 1240,
    height: 1754,
    webPreferences: {
      sandbox: true
    }
  })

  try {
    await pdfWindow.loadFile(htmlPath)
    await new Promise((resolve) => setTimeout(resolve, 400))

    const pdfData = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: 'A4'
    })

    await writeFile(result.filePath, pdfData)
    return { canceled: false, filePath: result.filePath }
  } finally {
    pdfWindow.destroy()
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
  }
})

ipcMain.handle('docx:export', async (_event, data: ArrayBuffer, suggestedName?: string) => {
  const result = await dialog.showSaveDialog({
    title: '匯出 Word',
    defaultPath: suggestedName
      ? suggestedName.replace(extname(suggestedName), '.docx')
      : 'document.docx',
    filters: [{ name: 'Word 文件', extensions: ['docx'] }]
  })

  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }

  await writeFile(result.filePath, Buffer.from(data))
  return { canceled: false, filePath: result.filePath }
})

ipcMain.handle(
  'diagram:rasterize',
  async (_event, svgHtml: string, width: number, height: number) => {
    const cssWidth = Math.max(80, Math.ceil(width))
    const cssHeight = Math.max(80, Math.ceil(height))

    const page = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    html, body {
      margin: 0;
      padding: 8px;
      background: #fffdf8;
      overflow: hidden;
      font-family: "Segoe UI", "Microsoft JhengHei", "PingFang TC", sans-serif;
    }
    svg {
      display: block;
      max-width: none !important;
    }
    .nodeLabel, .edgeLabel, .label, .actor, foreignObject div, foreignObject span {
      font-family: "Segoe UI", "Microsoft JhengHei", "PingFang TC", sans-serif;
    }
  </style>
</head>
<body>${svgHtml}</body>
</html>`

    const tempDir = await mkdtemp(join(tmpdir(), 'md2pdf-mmd-'))
    const htmlPath = join(tempDir, 'diagram.html')
    await writeFile(htmlPath, page, 'utf-8')

    const win = new BrowserWindow({
      show: false,
      x: -20000,
      y: -20000,
      width: cssWidth + 16,
      height: cssHeight + 16,
      useContentSize: true,
      frame: false,
      skipTaskbar: true,
      focusable: false,
      backgroundColor: '#fffdf8',
      webPreferences: {
        sandbox: true
      }
    })

    try {
      await win.loadFile(htmlPath)
      win.showInactive()
      await win.webContents.executeJavaScript(
        'document.fonts ? document.fonts.ready.then(() => true) : true'
      )
      await new Promise((resolve) => setTimeout(resolve, 280))

      const measured = (await win.webContents.executeJavaScript(`({
        w: Math.ceil(Math.max(document.body.scrollWidth, document.documentElement.scrollWidth)),
        h: Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight))
      })`)) as { w: number; h: number }

      win.setContentSize(Math.max(cssWidth + 16, measured.w), Math.max(cssHeight + 16, measured.h))
      await new Promise((resolve) => setTimeout(resolve, 150))

      const image = await win.webContents.capturePage()
      return {
        dataUrl: image.toDataURL(),
        width: cssWidth,
        height: cssHeight
      }
    } finally {
      win.destroy()
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
    }
  }
)

ipcMain.handle('file:readRelative', async (_event, baseFilePath: string, relativePath: string) => {
  if (!baseFilePath) return null
  const absolute = join(dirname(baseFilePath), relativePath)
  try {
    const buffer = await readFile(absolute)
    const ext = extname(absolute).toLowerCase()
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : ext === '.gif'
            ? 'image/gif'
            : ext === '.svg'
              ? 'image/svg+xml'
              : ext === '.webp'
                ? 'image/webp'
                : 'application/octet-stream'
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
})
