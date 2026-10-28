import { useCallback, useEffect, useMemo, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Toolbar } from './components/Toolbar'
import { EditorPane } from './components/EditorPane'
import { PreviewPane } from './components/PreviewPane'
import { buildPrintDocument } from './lib/printDocument'
import { buildDocxFromPreview } from './lib/buildDocx'
import { SAMPLE_MARKDOWN } from './lib/sampleDoc'
import { countMermaidBlocks } from './lib/markdown'
import { getApi } from './lib/platform'

export default function App() {
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [fileName, setFileName] = useState('示範文件.md')
  const [dirty, setDirty] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)
  const [previewReady, setPreviewReady] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('表格與 Mermaid 流程圖會在預覽中即時轉換')

  const mermaidCount = useMemo(() => countMermaidBlocks(markdown), [markdown])
  const words = markdown.length

  const handleChange = useCallback((value: string) => {
    setMarkdown(value)
    setDirty(true)
  }, [])

  const openFile = useCallback(async () => {
    const result = await getApi().openFile()
    if (!result) return
    setMarkdown(result.content)
    setFilePath(result.filePath)
    setFileName(result.fileName)
    setDirty(false)
    setStatus(`已開啟 ${result.fileName}`)
  }, [])

  const saveFile = useCallback(async () => {
    if (filePath) {
      await getApi().saveFile(filePath, markdown)
      setDirty(false)
      setStatus(`已儲存 ${fileName}`)
      return
    }
    const result = await getApi().saveFileAs(markdown, fileName)
    if (!result) return
    setFilePath(result.filePath)
    setFileName(result.fileName)
    setDirty(false)
    setStatus(`已儲存 ${result.fileName}`)
  }, [filePath, fileName, markdown])

  const exportPdf = useCallback(async () => {
    if (!previewReady) {
      setStatus('請稍候，預覽中的 Mermaid 圖仍在渲染')
      return
    }
    const body = document.querySelector('.preview-frame')?.innerHTML
    if (!body) {
      setStatus('找不到預覽內容')
      return
    }
    setExporting('pdf')
    setStatus('正在匯出 PDF…')
    try {
      const html = buildPrintDocument(body, fileName)
      const result = await getApi().exportPdf(html, fileName)
      if (result.canceled) {
        setStatus('已取消匯出')
      } else {
        setStatus(`PDF 已儲存：${result.filePath}`)
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '匯出失敗')
    } finally {
      setExporting(null)
    }
  }, [fileName, previewReady])

  const exportDocx = useCallback(async () => {
    if (!previewReady) {
      setStatus('請稍候，預覽中的 Mermaid 圖仍在渲染')
      return
    }
    if (!document.querySelector('.preview-frame')) {
      setStatus('找不到預覽內容')
      return
    }
    setExporting('docx')
    setStatus('正在匯出 Word…')
    try {
      const buffer = await buildDocxFromPreview()
      const result = await getApi().exportDocx(buffer, fileName)
      if (result.canceled) {
        setStatus('已取消匯出')
      } else {
        setStatus(`Word 已儲存：${result.filePath}`)
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '匯出 Word 失敗')
    } finally {
      setExporting(null)
    }
  }, [fileName, previewReady])

  const newFile = useCallback(() => {
    setMarkdown('# 新文件\n\n')
    setFilePath(null)
    setFileName('untitled.md')
    setDirty(false)
    setStatus('已建立空白文件')
  }, [])

  useEffect(() => {
    const api = getApi()
    const offOpen = api.onMenuOpen(() => void openFile())
    const offSave = api.onMenuSave(() => void saveFile())
    const offExport = api.onMenuExport(() => void exportPdf())
    const offExportDocx = api.onMenuExportDocx(() => void exportDocx())
    return () => {
      offOpen()
      offSave()
      offExport()
      offExportDocx()
    }
  }, [openFile, saveFile, exportPdf, exportDocx])

  return (
    <div
      className="app-shell"
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (event) => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files[0]
        if (!file || !/\.(md|markdown|mdown)$/i.test(file.name)) {
          setStatus('請拖放 .md 檔案')
          return
        }
        const content = await file.text()
        const droppedPath = (file as File & { path?: string }).path
        setMarkdown(content)
        setFileName(file.name)
        setFilePath(droppedPath ?? null)
        setDirty(false)
        setStatus(`已開啟 ${file.name}`)
      }}
    >
      {dragging ? <div className="drop-mask">放開以開啟 Markdown</div> : null}
      <div className="app">
        <Toolbar
          fileName={fileName}
          dirty={dirty}
          exporting={exporting}
          onOpen={() => void openFile()}
          onSave={() => void saveFile()}
          onExportPdf={() => void exportPdf()}
          onExportDocx={() => void exportDocx()}
          onNew={newFile}
        />
        <div className="workspace">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={46} minSize={28}>
              <EditorPane value={markdown} onChange={handleChange} />
            </Panel>
            <PanelResizeHandle className="resize-handle" />
            <Panel defaultSize={54} minSize={32}>
              <PreviewPane
                markdown={markdown}
                mermaidCount={mermaidCount}
                filePath={filePath}
                onReadyChange={setPreviewReady}
              />
            </Panel>
          </PanelGroup>
        </div>
        <footer className="status-bar">
          <span>{status}</span>
          <span>
            {words} 字 · {mermaidCount} 張圖 · {previewReady ? '預覽完成' : '渲染中'}
          </span>
        </footer>
      </div>
    </div>
  )
}
