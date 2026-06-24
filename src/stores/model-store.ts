/**
 * 智语 Studio — 模型管理状态 (Zustand)
 */
import { create } from 'zustand'
import { message } from 'antd'
import type { LocalModel, HFModel, DownloadProgress, GPUInfo, ModelConfig } from '../types'
import { modelClient, settingsClient, chatClient } from '../services/ipc-client'

interface ModelState {
  localModels: LocalModel[]
  hfModels: HFModel[]
  downloadProgress: Map<string, DownloadProgress>
  downloadCleanup: (() => void) | null
  gpuInfo: GPUInfo | null
  loadedModel: LocalModel | null
  modelConfig: ModelConfig
  isScanning: boolean
  isSearching: boolean
  isLoadingModel: boolean
  loadingModelName: string

  scanModels: () => Promise<void>
  searchHF: (query: string) => Promise<void>
  startDownload: (modelId: string, url: string) => Promise<void>
  cancelDownload: (modelId: string) => Promise<void>
  deleteModel: (modelId: string) => Promise<void>
  loadModel: (model: LocalModel) => Promise<boolean>
  unloadModel: () => Promise<void>
  detectGPU: () => Promise<void>
  updateConfig: (config: Partial<ModelConfig>) => void
  getDownloadProgress: (modelId: string) => DownloadProgress | undefined
}

export const useModelStore = create<ModelState>((set, get) => ({
  localModels: [],
  hfModels: [],
  downloadProgress: new Map(),
  downloadCleanup: null as (() => void) | null,
  gpuInfo: null,
  loadedModel: null,
  modelConfig: {
    contextSize: 32768,
    batchSize: 1024,
    ubatchSize: 512,
    parallel: 1,
    keep: 0,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 4096,
    gpuLayers: 99,
    threads: 8,
    seed: -1,
    flashAttention: false,
    mlock: false,
    noMmap: false,
    numa: false,
    mmprojPath: '',
    systemPrompt: '你是一个智能助手。请用中文回答问题，保持回答准确、简洁、有帮助。'
  },
  isScanning: false,
  isSearching: false,
  isLoadingModel: false,
  loadingModelName: '',

  scanModels: async () => {
    set({ isScanning: true })
    try {
      const models = await modelClient.scanModels()
      set({ localModels: models })
      const status = await chatClient.getModelStatus()
      if (status.isLoaded && status.modelPath) {
        const current = models.find(m => m.filePath === status.modelPath)
        set({ loadedModel: current || null })
      } else {
        set({ loadedModel: null })
      }
    } catch (error) {
      console.error('扫描模型失败:', error)
    } finally {
      set({ isScanning: false })
    }
  },

  searchHF: async (query: string) => {
    if (!query.trim()) {
      set({ hfModels: [] })
      return
    }
    set({ isSearching: true })
    try {
      const models = await modelClient.searchHFModels(query, 20)
      set({ hfModels: models })
    } catch (error) {
      console.error('搜索模型失败:', error)
    } finally {
      set({ isSearching: false })
    }
  },

  startDownload: async (modelId: string, url: string) => {
    const prevCleanup = get().downloadCleanup
    if (prevCleanup) prevCleanup()
    const cleanup = modelClient.onDownloadProgress((progress: DownloadProgress) => {
      set(state => {
        const newProgress = new Map(state.downloadProgress)
        newProgress.set(progress.modelId, progress)
        return { downloadProgress: newProgress }
      })
    })
    set({ downloadCleanup: cleanup })
    try {
      await modelClient.downloadModel(modelId, url)
    } catch (error) {
      console.error('下载失败:', error)
    }
  },

  cancelDownload: async (modelId: string) => {
    await modelClient.cancelDownload(modelId)
  },

  deleteModel: async (modelId: string) => {
    await modelClient.deleteModel(modelId)
    set(state => ({
      localModels: state.localModels.filter(m => m.id !== modelId)
    }))
  },

  loadModel: async (model: LocalModel) => {
    set({ isLoadingModel: true, loadingModelName: model.name })
    try {
      const config = { ...get().modelConfig }
      config.mmprojPath = ''
      const mmproj = await modelClient.detectMmproj(model.filePath)
      if (mmproj) {
        config.mmprojPath = mmproj
        set({ modelConfig: { ...get().modelConfig, mmprojPath: mmproj } })
      }
      const success = await chatClient.loadModel(model.filePath, config)
      if (success) {
        set({ loadedModel: model })
      }
      return success
    } catch (error) {
      console.error('加载模型失败:', error)
      message.error(`模型加载失败: ${(error as Error).message}`)
      return false
    } finally {
      set({ isLoadingModel: false, loadingModelName: '' })
    }
  },

  unloadModel: async () => {
    await chatClient.unloadModel()
    set({ loadedModel: null })
  },

  detectGPU: async () => {
    try {
      const gpuInfo = await settingsClient.detectGPU()
      set({ gpuInfo })
    } catch (error) {
      console.error('GPU 检测失败:', error)
    }
  },

  updateConfig: (config: Partial<ModelConfig>) => {
    set(state => ({
      modelConfig: { ...state.modelConfig, ...config }
    }))
  },

  getDownloadProgress: (modelId: string) => {
    return get().downloadProgress.get(modelId)
  }
}))
