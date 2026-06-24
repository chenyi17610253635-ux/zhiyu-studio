/**
 * 智语 Studio — IPC 客户端封装
 * 通过 window.zhiyuAPI 与 Electron 主进程通信
 */
import type {
  LocalModel, HFModel, DownloadProgress,
  ChatSession, ChatMessage, InferenceMessage,
  RagDocument, RagSearchResult, RagStats,
  GPUInfo, ServerStatus, AppSettings, ModelConfig
} from '../types'

const api = window.zhiyuAPI

// ============ 模型管理 ============
export const modelClient = {
  scanModels: (): Promise<LocalModel[]> => api.scanModels(),
  getModelInfo: (modelPath: string) => api.getModelInfo(modelPath),
  deleteModel: (modelId: string) => api.deleteModel(modelId),
  searchHFModels: (query: string, limit?: number): Promise<HFModel[]> => api.searchHFModels(query, limit),
  downloadModel: (modelId: string, url: string) => api.downloadModel(modelId, url),
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => api.onDownloadProgress(callback),
  cancelDownload: (modelId: string) => api.cancelDownload(modelId),
  detectMmproj: (modelPath: string): Promise<string | null> => api.detectMmproj(modelPath),
}

// ============ 聊天推理 ============
export const chatClient = {
  loadModel: (modelPath: string, config?: Partial<ModelConfig>) => api.loadModel(modelPath, config),
  unloadModel: () => api.unloadModel(),
  getModelStatus: () => api.getModelStatus(),
  streamChat: (messages: InferenceMessage[], options?: Partial<ModelConfig>): Promise<string> =>
    api.streamChat(messages, options),
  onStreamToken: (callback: (token: string) => void) => api.onStreamToken(callback),
  onStreamDone: (callback: (fullText: string) => void) => api.onStreamDone(callback),
  onStreamError: (callback: (error: string) => void) => api.onStreamError(callback),
}

// ============ 会话管理 ============
export const sessionClient = {
  getSessions: (): Promise<ChatSession[]> => api.getSessions(),
  createSession: (title?: string): Promise<ChatSession> => api.createSession(title),
  deleteSession: (sessionId: string) => api.deleteSession(sessionId),
  updateSessionTitle: (sessionId: string, title: string) => api.updateSessionTitle(sessionId, title),
  getSessionMessages: (sessionId: string): Promise<ChatMessage[]> => api.getSessionMessages(sessionId),
  addMessageToSession: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) =>
    api.addMessageToSession(sessionId, message),
}

// ============ RAG 知识库 ============
export const ragClient = {
  uploadDocument: (filePath: string, kbName?: string): Promise<RagDocument> => api.uploadDocument(filePath, kbName),
  getDocuments: (): Promise<RagDocument[]> => api.getDocuments(),
  deleteDocument: (docId: string) => api.deleteDocument(docId),
  search: (query: string, topK?: number): Promise<RagSearchResult[]> => api.searchKnowledgeBase(query, topK),
  ragChat: (query: string, messages: ChatMessage[], options?: any) => api.ragChat(query, messages, options),
  getStats: (): Promise<RagStats> => api.getRagStats(),
}

// ============ API 服务器 ============
export const serverClient = {
  getStatus: (): Promise<ServerStatus> => api.getServerStatus(),
  toggle: (enable: boolean) => api.toggleServer(enable),
  getPort: (): Promise<number> => api.getServerPort(),
}

// ============ 设置 ============
export const settingsClient = {
  getSettings: (): Promise<AppSettings> => api.getSettings(),
  updateSettings: (settings: Partial<AppSettings>) => api.updateSettings(settings),
  detectGPU: (): Promise<GPUInfo> => api.detectGPU(),
}

// ============ 对话框 ============
export const dialogClient = {
  openFile: (options?: any): Promise<string | null> => api.openFileDialog(options),
  openDirectory: (): Promise<string | null> => api.openDirectoryDialog(),
}

// ============ 应用信息 ============
export const appClient = {
  getPaths: () => api.getAppPaths(),
  getVersion: (): Promise<string> => api.getAppVersion(),
}
