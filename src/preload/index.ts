import { contextBridge, ipcRenderer } from 'electron'

export type OpenedFile = {
  filePath: string
  content: string
  fileName: string
}

export type SavedFile = {
  filePath: string
  fileName: string
}

const api = {
  openFile: (): Promise<OpenedFile | null> => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (filePath: string, content: string): Promise<SavedFile> =>
    ipcRenderer.invoke('file:save', filePath, content),
  saveFileAs: (content: string, suggestedName?: string): Promise<SavedFile | null> =>
    ipcRenderer.invoke('dialog:saveFile', content, suggestedName),
  exportPdf: (
    html: string,
    suggestedName?: string
  ): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke('pdf:export', html, suggestedName),
  exportDocx: (
    data: ArrayBuffer,
    suggestedName?: string
  ): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke('docx:export', data, suggestedName),
  rasterizeHtml: (
    svgHtml: string,
    width: number,
    height: number
  ): Promise<{ dataUrl: string; width: number; height: number }> =>
    ipcRenderer.invoke('diagram:rasterize', svgHtml, width, height),
  readRelative: (baseFilePath: string, relativePath: string): Promise<string | null> =>
    ipcRenderer.invoke('file:readRelative', baseFilePath, relativePath),
  onMenuOpen: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('menu:open', listener)
    return () => ipcRenderer.removeListener('menu:open', listener)
  },
  onMenuSave: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('menu:save', listener)
    return () => ipcRenderer.removeListener('menu:save', listener)
  },
  onMenuExport: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('menu:export', listener)
    return () => ipcRenderer.removeListener('menu:export', listener)
  },
  onMenuExportDocx: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('menu:exportDocx', listener)
    return () => ipcRenderer.removeListener('menu:exportDocx', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
