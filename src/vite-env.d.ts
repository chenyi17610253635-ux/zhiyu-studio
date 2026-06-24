/// <reference types="vite/client" />

declare module 'react-syntax-highlighter'
declare module 'react-syntax-highlighter/dist/esm/styles/prism'
declare module 'remark-gfm'
declare module 'remark-math'
declare module 'rehype-katex'

interface ZhiyuAPI {
  scanModels: () => Promise<any[]>
  getModelInfo: (modelPath: string) => Promise<any>
  deleteModel: (modelId: string) => Promise<boolean>
  searchHFModels: (query: string, limit?: number) => Promise<any[]>
  downloadModel: (modelId: string, url: string) => Promise<void>
  onDownloadProgress: (callback: (progress: any) => void) => () => void
  cancelDownload: (modelId: string) => Promise<void>
  loadModel: (modelPath: string, config: any) => Promise<boolean>
  unloadModel: () => Promise<void>
  getModelStatus: () => Promise<any>
  streamChat: (messages: any[], options?: any) => Promise<string>
  onStreamToken: (callback: (token: string) => void) => () => void
  onStreamDone: (callback: (fullText: string) => void) => () => void
  onStreamError: (callback: (error: string) => void) => () => void
  getSessions: () => Promise<any[]>
  createSession: (title?: string) => Promise<any>
  deleteSession: (sessionId: string) => Promise<void>
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>
  getSessionMessages: (sessionId: string) => Promise<any[]>
  addMessageToSession: (sessionId: string, message: any) => Promise<void>
  uploadDocument: (filePath: string, kbName?: string) => Promise<any>
  getDocuments: () => Promise<any[]>
  deleteDocument: (docId: string) => Promise<void>
  searchKnowledgeBase: (query: string, topK?: number) => Promise<any[]>
  ragChat: (query: string, messages: any[], options?: any) => Promise<string>
  getRagStats: () => Promise<any>
  getServerStatus: () => Promise<any>
  toggleServer: (enable: boolean) => Promise<void>
  getServerPort: () => Promise<number>
  getSettings: () => Promise<any>
  updateSettings: (settings: any) => Promise<void>
  detectGPU: () => Promise<any>
  openFileDialog: (options?: any) => Promise<string | null>
  openDirectoryDialog: () => Promise<string | null>
  openModelsFolder: () => Promise<void>
  getAppPaths: () => Promise<any>
  getAppVersion: () => Promise<string>
}

declare global {
  interface Window {
    zhiyuAPI: ZhiyuAPI
  }
}
