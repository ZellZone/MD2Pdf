export type OpenedFile = {
  filePath: string
  content: string
  fileName: string
}

export type SavedFile = {
  filePath: string
  fileName: string
}

export type ElectronAPI = {
  openFile: () => Promise<OpenedFile | null>
  saveFile: (filePath: string, content: string) => Promise<SavedFile>
  saveFileAs: (content: string, suggestedName?: string) => Promise<SavedFile | null>
  exportPdf: (
    html: string,
    suggestedName?: string
  ) => Promise<{ canceled: boolean; filePath?: string }>
  exportDocx: (
    data: ArrayBuffer,
    suggestedName?: string
  ) => Promise<{ canceled: boolean; filePath?: string }>
  rasterizeHtml: (
    svgHtml: string,
    width: number,
    height: number
  ) => Promise<{ dataUrl: string; width: number; height: number }>
  readRelative: (baseFilePath: string, relativePath: string) => Promise<string | null>
  onMenuOpen: (callback: () => void) => () => void
  onMenuSave: (callback: () => void) => () => void
  onMenuExport: (callback: () => void) => () => void
  onMenuExportDocx: (callback: () => void) => () => void
}

declare global {
  interface Window {
    api?: ElectronAPI
  }
}

export {}
