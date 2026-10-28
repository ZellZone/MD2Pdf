import type { ElectronAPI, OpenedFile, SavedFile } from '../../../preload/index.d'

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function download(filename: string, contents: string, type: string): void {
  downloadBlob(filename, new Blob([contents], { type }))
}

const browserApi: ElectronAPI = {
  async openFile() {
    const file = await pickFile('.md,.markdown,text/markdown')
    if (!file) return null
    return {
      filePath: file.name,
      fileName: file.name,
      content: await file.text()
    } satisfies OpenedFile
  },
  async saveFile(filePath, content) {
    download(filePath || 'untitled.md', content, 'text/markdown')
    return { filePath, fileName: filePath } satisfies SavedFile
  },
  async saveFileAs(content, suggestedName) {
    const name = suggestedName || 'untitled.md'
    download(name, content, 'text/markdown')
    return { filePath: name, fileName: name }
  },
  async exportPdf(html, suggestedName) {
    const frame = document.createElement('iframe')
    frame.style.position = 'fixed'
    frame.style.right = '0'
    frame.style.bottom = '0'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    document.body.appendChild(frame)
    const doc = frame.contentDocument
    if (!doc) {
      document.body.removeChild(frame)
      return { canceled: true }
    }
    doc.open()
    doc.write(html)
    doc.close()
    await new Promise((resolve) => setTimeout(resolve, 300))
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    window.setTimeout(() => document.body.removeChild(frame), 1000)
    return { canceled: false, filePath: suggestedName?.replace(/\.md$/i, '.pdf') }
  },
  async exportDocx(data, suggestedName) {
    const name = (suggestedName || 'document').replace(/\.[^.]+$/, '') + '.docx'
    downloadBlob(
      name,
      new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
    )
    return { canceled: false, filePath: name }
  },
  async rasterizeHtml(svgHtml, width, height) {
    const svg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgHtml)
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('SVG 轉圖失敗'))
      img.src = svg
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(width * 2)
    canvas.height = Math.ceil(height * 2)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('無法建立畫布')
    ctx.fillStyle = '#fffdf8'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return { dataUrl: canvas.toDataURL('image/png'), width, height }
  },
  async readRelative() {
    return null
  },
  onMenuOpen: () => () => undefined,
  onMenuSave: () => () => undefined,
  onMenuExport: () => () => undefined,
  onMenuExportDocx: () => () => undefined
}

export function getApi(): ElectronAPI {
  return window.api ?? browserApi
}
