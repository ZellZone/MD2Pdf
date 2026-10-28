import { FileDown, FilePlus, FileText, FolderOpen, Save } from 'lucide-react'

type ToolbarProps = {
  fileName: string
  dirty: boolean
  exporting: 'pdf' | 'docx' | null
  onOpen: () => void
  onSave: () => void
  onExportPdf: () => void
  onExportDocx: () => void
  onNew: () => void
}

export function Toolbar({
  fileName,
  dirty,
  exporting,
  onOpen,
  onSave,
  onExportPdf,
  onExportDocx,
  onNew
}: ToolbarProps) {
  const busy = exporting !== null
  return (
    <header className="toolbar">
      <div className="brand">
        <div className="brand-mark" aria-hidden>
          M
        </div>
        <div>
          <div className="brand-name">MD2Pdf</div>
          <div className="brand-sub">表格 · Mermaid · 預覽</div>
        </div>
      </div>
      <div className="file-meta">
        <div className="file-name">{fileName}</div>
        <div className="file-status">{dirty ? '未儲存變更' : '已與磁碟同步'}</div>
      </div>
      <div className="toolbar-actions">
        <button className="btn" type="button" onClick={onNew} disabled={busy}>
          <FilePlus size={15} />
          新文件
        </button>
        <button className="btn" type="button" onClick={onOpen} disabled={busy}>
          <FolderOpen size={15} />
          開啟
        </button>
        <button className="btn" type="button" onClick={onSave} disabled={busy}>
          <Save size={15} />
          儲存
        </button>
        <button className="btn btn-primary" type="button" onClick={onExportPdf} disabled={busy}>
          <FileDown size={15} />
          {exporting === 'pdf' ? '匯出中…' : '匯出 PDF'}
        </button>
        <button className="btn" type="button" onClick={onExportDocx} disabled={busy}>
          <FileText size={15} />
          {exporting === 'docx' ? '匯出中…' : '匯出 Word'}
        </button>
      </div>
    </header>
  )
}
