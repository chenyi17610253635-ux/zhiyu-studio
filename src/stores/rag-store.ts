/**
 * 智语 Studio — RAG 知识库状态管理 (Zustand)
 */
import { create } from 'zustand'
import type { RagDocument, RagStats, ChatMessage } from '../types'
import { ragClient, chatClient } from '../services/ipc-client'

interface RagState {
  documents: RagDocument[]
  stats: RagStats | null
  isUploading: boolean
  isSearching: boolean
  isRagMode: boolean
  ragResponse: string | null

  loadDocuments: () => Promise<void>
  loadStats: () => Promise<void>
  uploadDocument: (filePath: string, kbName?: string) => Promise<RagDocument>
  deleteDocument: (docId: string) => Promise<void>
  search: (query: string) => Promise<any[]>
  ragChat: (query: string, messages: ChatMessage[]) => Promise<void>
  toggleRagMode: () => void
}

export const useRagStore = create<RagState>((set, get) => ({
  documents: [],
  stats: null,
  isUploading: false,
  isSearching: false,
  isRagMode: false,
  ragResponse: null,

  loadDocuments: async () => {
    try {
      const documents = await ragClient.getDocuments()
      set({ documents })
    } catch (error) {
      console.error('加载文档列表失败:', error)
    }
  },

  loadStats: async () => {
    try {
      const stats = await ragClient.getStats()
      set({ stats })
    } catch (error) {
      console.error('加载统计信息失败:', error)
    }
  },

  uploadDocument: async (filePath: string, kbName?: string): Promise<RagDocument> => {
    set({ isUploading: true })
    try {
      const doc = await ragClient.uploadDocument(filePath, kbName)
      set(state => ({
        documents: [doc, ...state.documents]
      }))
      await get().loadStats()
      return doc
    } catch (error) {
      console.error('文档上传失败:', error)
      throw error
    } finally {
      set({ isUploading: false })
    }
  },

  deleteDocument: async (docId: string) => {
    await ragClient.deleteDocument(docId)
    set(state => ({
      documents: state.documents.filter(d => d.id !== docId)
    }))
    await get().loadStats()
  },

  search: async (query: string) => {
    set({ isSearching: true })
    try {
      const results = await ragClient.search(query)
      return results
    } catch (error) {
      console.error('知识库搜索失败:', error)
      return []
    } finally {
      set({ isSearching: false })
    }
  },

  ragChat: async (query: string, messages: ChatMessage[]) => {
    set({ isSearching: true, ragResponse: null })
    try {
      const result = await ragClient.ragChat(query, messages)
      set({ ragResponse: result, isSearching: false })
    } catch (error) {
      console.error('RAG 对话失败:', error)
      set({ isSearching: false })
    }
  },

  toggleRagMode: () => {
    set(state => ({
      isRagMode: !state.isRagMode,
      ragResponse: null
    }))
  }
}))
