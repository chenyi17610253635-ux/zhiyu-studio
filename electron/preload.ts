/**
 * 智语 Studio — 预加载脚本
 * 通过 contextBridge 安全暴露 IPC API 给渲染进程
 */
import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('zhiyuAPI', {
  // ============ 模型管理 ============
  /** 扫描本地模型 */
  scanModels: () => ipcRenderer.invoke('model:scan'),
  /** 获取模型元数据 */
  getModelInfo: (modelPath: string) => ipcRenderer.invoke('model:getInfo', modelPath),
  /** 删除模型 */
  deleteModel: (modelId: string) => ipcRenderer.invoke('model:delete', modelId),
  /** 搜索 HuggingFace 模型 */
  searchHFModels: (query: string, limit?: number) => ipcRenderer.invoke('model:searchHF', query, limit),
  /** 下载模型（带进度回调） */
  downloadModel: (modelId: string, url: string) => ipcRenderer.invoke('model:download', modelId, url),
  /** 监听下载进度 */
  onDownloadProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('model:downloadProgress', handler)
    return () => ipcRenderer.removeListener('model:downloadProgress', handler)
  },
  /** 取消下载 */
  cancelDownload: (modelId: string) => ipcRenderer.invoke('model:cancelDownload', modelId),
  /** 自动检测匹配的 mmproj 文件 */
  detectMmproj: (modelPath: string) => ipcRenderer.invoke('model:detectMmproj', modelPath),

  // ============ 聊天推理 ============
  /** 加载模型 */
  loadModel: (modelPath: string, config: any) => ipcRenderer.invoke('chat:loadModel', modelPath, config),
  /** 卸载模型 */
  unloadModel: () => ipcRenderer.invoke('chat:unloadModel'),
  /** 获取当前模型状态 */
  getModelStatus: () => ipcRenderer.invoke('chat:getModelStatus'),
  /** 流式对话 */
  streamChat: (messages: any[], options?: any) => ipcRenderer.invoke('chat:stream', messages, options),
  /** 监听流式 token */
  onStreamToken: (callback: (token: string) => void) => {
    const handler = (_event: any, token: string) => callback(token)
    ipcRenderer.on('chat:streamToken', handler)
    return () => ipcRenderer.removeListener('chat:streamToken', handler)
  },
  /** 监听流式结束 */
  onStreamDone: (callback: (fullText: string) => void) => {
    const handler = (_event: any, fullText: string) => callback(fullText)
    ipcRenderer.on('chat:streamDone', handler)
    return () => ipcRenderer.removeListener('chat:streamDone', handler)
  },
  /** 监听流式错误 */
  onStreamError: (callback: (error: string) => void) => {
    const handler = (_event: any, error: string) => callback(error)
    ipcRenderer.on('chat:streamError', handler)
    return () => ipcRenderer.removeListener('chat:streamError', handler)
  },

  // ============ 会话管理 ============
  /** 获取所有会话 */
  getSessions: () => ipcRenderer.invoke('chat:getSessions'),
  /** 创建新会话 */
  createSession: (title?: string) => ipcRenderer.invoke('chat:createSession', title),
  /** 删除会话 */
  deleteSession: (sessionId: string) => ipcRenderer.invoke('chat:deleteSession', sessionId),
  /** 更新会话标题 */
  updateSessionTitle: (sessionId: string, title: string) => ipcRenderer.invoke('chat:updateSessionTitle', sessionId, title),
  /** 获取会话消息 */
  getSessionMessages: (sessionId: string) => ipcRenderer.invoke('chat:getSessionMessages', sessionId),
  /** 添加消息到会话 */
  addMessageToSession: (sessionId: string, message: any) => ipcRenderer.invoke('chat:addMessage', sessionId, message),

  // ============ RAG 知识库 ============
  /** 上传文档到知识库 */
  uploadDocument: (filePath: string, kbName?: string) => ipcRenderer.invoke('rag:uploadDocument', filePath, kbName),
  /** 获取文档列表 */
  getDocuments: () => ipcRenderer.invoke('rag:getDocuments'),
  /** 删除文档 */
  deleteDocument: (docId: string) => ipcRenderer.invoke('rag:deleteDocument', docId),
  /** 搜索知识库 */
  searchKnowledgeBase: (query: string, topK?: number) => ipcRenderer.invoke('rag:search', query, topK),
  /** RAG 增强对话 */
  ragChat: (query: string, messages: any[], options?: any) => ipcRenderer.invoke('rag:chat', query, messages, options),
  /** 获取知识库统计 */
  getRagStats: () => ipcRenderer.invoke('rag:getStats'),

  // ============ API 服务器 ============
  /** 获取服务器状态 */
  getServerStatus: () => ipcRenderer.invoke('server:getStatus'),
  /** 启动/停止服务器 */
  toggleServer: (enable: boolean) => ipcRenderer.invoke('server:toggle', enable),
  /** 获取服务器端口 */
  getServerPort: () => ipcRenderer.invoke('server:getPort'),

  // ============ 设置 ============
  /** 获取所有设置 */
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  /** 更新设置 */
  updateSettings: (settings: any) => ipcRenderer.invoke('settings:update', settings),
  /** 检测 GPU 信息 */
  detectGPU: () => ipcRenderer.invoke('settings:detectGPU'),

  // ============ 对话框 ============
  /** 打开文件选择 */
  openFileDialog: (options?: any) => ipcRenderer.invoke('dialog:openFile', options),
  /** 打开文件夹选择 */
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),

  // ============ 应用信息 ============
  /** 获取应用路径信息 */
  getAppPaths: () => ipcRenderer.invoke('app:getPaths'),
  /** 获取应用版本 */
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  /** 打开模型目录 */
  openModelsFolder: () => ipcRenderer.invoke('app:openModelsFolder'),

  /** 监听模型被卸载事件（llama-server 退出时触发）reason: 'unload' | 'crash' | 'load_fail' */
  onModelUnloaded: (callback: (reason: string) => void) => {
    const handler = (_event: any, reason: string) => callback(reason)
    ipcRenderer.on('model:unloaded', handler)
    return () => ipcRenderer.removeListener('model:unloaded', handler)
  }
})

// 类型声明
export interface ZhiyuAPI {
  scanModels: () => Promise<any[]>
  getModelInfo: (modelPath: string) => Promise<any>
  deleteModel: (modelId: string) => Promise<boolean>
  searchHFModels: (query: string, limit?: number) => Promise<any[]>
  downloadModel: (modelId: string, url: string) => Promise<void>
  onDownloadProgress: (callback: (progress: any) => void) => () => void
  cancelDownload: (modelId: string) => Promise<void>
  detectMmproj: (modelPath: string) => Promise<string | null>
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
  getAppPaths: () => Promise<any>
  getAppVersion: () => Promise<string>
  openModelsFolder: () => Promise<void>
  onModelUnloaded: (callback: (reason: string) => void) => () => void
}

// 扩展 Window 接口
declare global {
  interface Window {
    zhiyuAPI: ZhiyuAPI
  }
}

