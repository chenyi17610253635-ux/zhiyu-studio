/**
 * 智语 Studio — 全局 TypeScript 类型定义
 */

// ============ 模型相关 ============
export interface LocalModel {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  addedAt: string
  name: string
  parameters?: string
  quantization?: string
}

export interface HFModel {
  id: string
  name: string
  author: string
  downloads: number
  likes: number
  updatedAt: string
  tags: string[]
  description?: string
}

export interface DownloadProgress {
  modelId: string
  fileName: string
  downloaded: number
  total: number
  percentage: number
  speed: number
  status: 'downloading' | 'completed' | 'cancelled' | 'error'
}

// ============ 模型配置 ============
export interface ModelConfig {
  contextSize: number
  batchSize: number
  ubatchSize: number
  parallel: number
  keep: number
  temperature: number
  topP: number
  maxTokens: number
  gpuLayers: number
  threads: number
  seed: number
  flashAttention: boolean
  mlock: boolean
  noMmap: boolean
  numa: boolean
  mmprojPath: string
  systemPrompt: string
}

// ============ 聊天相关 ============
export interface ChatAttachment {
  id: string
  type: 'image'
  name: string
  mimeType: string
  dataUrl: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  modelName?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  modelName?: string
  isStreaming?: boolean
  generationSpeed?: number
  tokenCount?: number
  attachments?: ChatAttachment[]
}

export interface InferenceMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: ChatAttachment[]
}

// ============ RAG 相关 ============
export interface RagDocument {
  id: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
  chunkCount: number
  uploadedAt: string
  knowledgeBase: string
}

export interface RagSearchResult {
  content: string
  score: number
  source: string
}

export interface RagStats {
  totalDocs: number
  totalChunks: number
  totalSize: number
  knowledgeBases: string[]
}

// ============ GPU 相关 ============
export interface GPUDevice {
  name: string
  vendor: string
  memoryMB: number
  driver?: string
  computeCapability?: string
  supportsCUDA?: boolean
  supportsVulkan?: boolean
  supportsROCm?: boolean
}

export interface GPUInfo {
  hasGPU: boolean
  devices: GPUDevice[]
  recommendedBackend: 'cuda' | 'vulkan' | 'metal' | 'cpu'
  totalMemoryMB: number
  detectionMethod: string
}

// ============ API 服务器 ============
export interface ServerStatus {
  isRunning: boolean
  port: number
  address: string
}

// ============ 应用设置 ============
export interface AppSettings {
  language: 'zh-CN' | 'en'
  modelsPath: string
  autoLoadLastModel: boolean
  defaultContextSize: number
  defaultTemperature: number
  defaultTopP: number
  defaultMaxTokens: number
  gpuLayers: number
  threads: number
  apiPort: number
  apiAutoStart: boolean
  theme: 'light' | 'dark' | 'auto'
  lastModelPath: string | null
}
