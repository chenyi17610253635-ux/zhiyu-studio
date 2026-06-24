/**
 * 智语 Studio — 聊天状态管理 (Zustand)
 */
import { create } from 'zustand'
import type { ChatSession, ChatMessage, ChatAttachment } from '../types'
import { sessionClient, chatClient } from '../services/ipc-client'
import { useModelStore } from './model-store'

interface ChatState {
  // 会话列表
  sessions: ChatSession[]
  // 当前活跃会话 ID
  activeSessionId: string | null
  // 当前会话消息
  messages: ChatMessage[]
  // 是否正在流式生成
  isStreaming: boolean
  // 流式文本缓冲区
  streamingText: string
  // 流式生成速度 (tokens/s)
  streamingSpeed: number
  // 已生成的 token 数
  tokenCount: number
  // 模型是否已加载
  isModelLoaded: boolean
  streamCleanup: (() => void) | null

  // 操作
  loadSessions: () => Promise<void>
  createSession: (title?: string) => Promise<ChatSession>
  deleteSession: (sessionId: string) => Promise<void>
  setActiveSession: (sessionId: string) => Promise<void>
  loadMessages: (sessionId: string) => Promise<void>
  sendMessage: (content: string, attachments?: ChatAttachment[]) => Promise<void>
  regenerateLastMessage: () => Promise<void>
  stopStreaming: () => void
  addAssistantMessage: (content: string) => void
  checkModelStatus: () => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: [],
  isStreaming: false,
  streamingText: '',
  streamingSpeed: 0,
  tokenCount: 0,
  isModelLoaded: false,
  streamCleanup: null,

  loadSessions: async () => {
    const sessions = await sessionClient.getSessions()
    // 同步模型加载状态
    const loadedModel = useModelStore.getState().loadedModel
    set({ sessions, isModelLoaded: loadedModel !== null })
  },

  createSession: async (title?: string) => {
    const session = await sessionClient.createSession(title)
    set(state => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
      messages: []
    }))
    return session
  },

  deleteSession: async (sessionId: string) => {
    await sessionClient.deleteSession(sessionId)
    set(state => {
      const newSessions = state.sessions.filter(s => s.id !== sessionId)
      return {
        sessions: newSessions,
        activeSessionId: state.activeSessionId === sessionId
          ? (newSessions[0]?.id || null)
          : state.activeSessionId,
        messages: state.activeSessionId === sessionId ? [] : state.messages
      }
    })
  },

  setActiveSession: async (sessionId: string) => {
    set({ activeSessionId: sessionId })
    await get().loadMessages(sessionId)
  },

  loadMessages: async (sessionId: string) => {
    const messages = await sessionClient.getSessionMessages(sessionId)
    set({ messages })
  },

  sendMessage: async (content: string, attachments: ChatAttachment[] = []) => {
    const { activeSessionId, isStreaming, messages } = get()
    if (!activeSessionId || isStreaming || (!content.trim() && attachments.length === 0)) return
    const prevCleanup = get().streamCleanup
    if (prevCleanup) prevCleanup()


    // 发送前同步模型加载状态
    const loadedModel = useModelStore.getState().loadedModel
    set({ isModelLoaded: loadedModel !== null })

    // 确保有活跃会话
    if (!activeSessionId) {
      await get().createSession()
    }

    const sessionId = get().activeSessionId!
    const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: 'user',
      content,
      attachments,
      modelName: undefined
    }

    try {
      await sessionClient.addMessageToSession(sessionId, userMessage)
    } catch {
      // 如果服务端保存失败，继续显示
    }

    // 添加到本地消息列表
    const newMsg: ChatMessage = {
      id: `local_${Date.now()}`,
      ...userMessage,
      timestamp: new Date().toISOString()
    }

    set(state => ({
      messages: [...state.messages, newMsg],
      isStreaming: true,
      streamingText: '',
      streamingSpeed: 0,
      tokenCount: 0
    }))

    // 速度追踪
    const startTime = Date.now()
    let tokenCount = 0
    let lastCheckTime = Date.now()
    let lastCheckTokens = 0

    // 构建消息历史
    const modelConfig = useModelStore.getState().modelConfig
    const systemMessage = modelConfig.systemPrompt?.trim()
      ? [{ role: 'system' as const, content: modelConfig.systemPrompt.trim() }]
      : []
    const history = [...systemMessage, ...get().messages]

    // 节流：累积 token，每 50ms 批量刷新 React 状态，避免每 token 一次全量 Markdown 重渲染
    let accumulatedTokens = ''
    let flushTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleFlush = () => {
      if (flushTimer) return
      flushTimer = setTimeout(() => {
        flushTimer = null
        const text = accumulatedTokens
        accumulatedTokens = ''
        if (text) {
          set(state => ({ streamingText: state.streamingText + text }))
        }
        // 如果有新的累积尚未处理，继续调度
        if (accumulatedTokens) scheduleFlush()
      }, 50)
    }

    // 设置流式回调
    const cleanupToken = chatClient.onStreamToken((token: string) => {
      tokenCount++
      const now = Date.now()
      // 每 500ms 更新一次速度
      if (now - lastCheckTime >= 500) {
        const recentTokens = tokenCount - lastCheckTokens
        const recentSeconds = (now - lastCheckTime) / 1000
        const speed = Math.round(recentTokens / recentSeconds)
        lastCheckTime = now
        lastCheckTokens = tokenCount
        set({ streamingSpeed: speed, tokenCount })
      }
      accumulatedTokens += token
      scheduleFlush()
    })

    const cleanupDone = chatClient.onStreamDone(async (fullText: string) => {
      cleanupToken()
      cleanupDone()
      cleanupError()

      // 保存最终速度到消息
      const finalSpeed = get().streamingSpeed
      const finalTokens = get().tokenCount

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: fullText,
        timestamp: new Date().toISOString(),
        generationSpeed: finalSpeed,
        tokenCount: finalTokens
      }

      try {
        await sessionClient.addMessageToSession(sessionId, {
          role: 'assistant',
          content: fullText
        })
      } catch {
        // 忽略保存失败
      }

      set(state => ({
        messages: [...state.messages, assistantMsg],
        isStreaming: false,
        streamingText: '',
        streamingSpeed: 0,
        tokenCount: 0,
        streamCleanup: null
      }))

      // 刷新会话列表（更新消息数和标题）
      await get().loadSessions()
    })

    const cleanupError = chatClient.onStreamError((error: string) => {
      cleanupToken()
      cleanupDone()
      cleanupError()

      set(state => ({
        messages: [...state.messages, {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `❌ 出错了：${error}`,
          timestamp: new Date().toISOString()
        }],
        isStreaming: false,
        streamingText: '',
        streamingSpeed: 0,
        tokenCount: 0
      }))
    })

    // 开始流式对话
    try {
      set({\\
        streamCleanup: () => {\\
          cleanupToken()\\
          cleanupDone()\\
          cleanupError()\\
        }\\
      })\\
      set({
        streamCleanup: () => {
          cleanupToken()
          cleanupDone()
          cleanupError()
        }
      })
      await chatClient.streamChat(history, modelConfig)
    } catch (error) {
      cleanupToken()
      cleanupDone()
      cleanupError()
      set({ isStreaming: false, streamingText: '', streamCleanup: null })
    }
  },

  regenerateLastMessage: async () => {
    const { messages, activeSessionId } = get()
    if (!activeSessionId) return

    // 找到最后一条用户消息
    const lastUserMsgIndex = [...messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserMsgIndex === -1) return

    const userMsg = [...messages].reverse()[lastUserMsgIndex]
    if (!userMsg) return

    // 如果最后一条消息已经是用户消息，没有 AI 回复可重新生成
    if (lastUserMsgIndex === 0) {
      const cleanup = get().streamCleanup\\
    if (cleanup) cleanup()\\
    const cleanup = get().streamCleanup
    if (cleanup) cleanup()
    set({ isStreaming: false })
      return
    }

    // 移除最后一条 AI 回复后的消息
    const filteredMessages = messages.slice(0, -(lastUserMsgIndex))

    set({ messages: filteredMessages, isStreaming: true, streamingText: '' })
    let accumulatedTokens = ''
    let flushTimer = null
    const scheduleFlush = () => {
      if (flushTimer) return
      flushTimer = setTimeout(() => {
        flushTimer = null
        const text = accumulatedTokens
        accumulatedTokens = ''
        if (text) {
          set(state => ({ streamingText: state.streamingText + text }))
        }
        if (accumulatedTokens) scheduleFlush()
      }, 50)
    }


    const cleanupToken = chatClient.onStreamToken((token: string) => {
      accumulatedTokens += token
      scheduleFlush()
    })

    const cleanupDone = chatClient.onStreamDone(async (fullText: string) => {
      cleanupToken()
      cleanupDone()
      cleanupError()

      const finalSpeed = get().streamingSpeed
      const finalTokens = get().tokenCount

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: fullText,
        timestamp: new Date().toISOString(),
        generationSpeed: finalSpeed,
        tokenCount: finalTokens
      }

      try {
        await sessionClient.addMessageToSession(activeSessionId, {
          role: 'assistant',
          content: fullText
        })
      } catch { /* ignore */ }

      set(state => ({
        messages: [...state.messages, assistantMsg],
        isStreaming: false,
        streamingText: '',
        streamingSpeed: 0,
        tokenCount: 0
      }))
    })

    const cleanupError = chatClient.onStreamError((error: string) => {
      cleanupToken()
      cleanupDone()
      cleanupError()
      set({ isStreaming: false, streamingText: '', streamCleanup: null })
    })

    try {
      await chatClient.streamChat(filteredMessages, useModelStore.getState().modelConfig)
    } catch {
      cleanupToken()
      cleanupDone()
      cleanupError()
      set({ isStreaming: false, streamingText: '', streamCleanup: null })
    }
  },

  stopStreaming: () => {
    const cleanup = get().streamCleanup\\
    if (cleanup) cleanup()\\
    set({ isStreaming: false })
  },

  addAssistantMessage: (content: string) => {
    set(state => ({
      messages: [...state.messages, {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString()
      }]
    }))
  },

  checkModelStatus: async () => {
    const loadedModel = useModelStore.getState().loadedModel
    set({ isModelLoaded: loadedModel !== null })
  }
}))
