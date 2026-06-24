/**
 * 智语 Studio — 会话管理服务
 * 管理多会话的创建、持久化和消息存储
 */
import fs from 'fs'
import path from 'path'
import type { ChatSession, ChatMessage as ChatMessageBase } from '../../src/types'
import { getAppPaths } from '../utils/paths'
import { logger } from '../utils/logger'

// ChatMessage 在 src/types 中定义了大量 UI 专用字段（isStreaming、generationSpeed 等），
// 服务端持久化使用更精简的版本，暂不直接引用 types 版本以避免序列化多余字段。
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  modelName?: string
  attachments?: Array<{
    id: string
    type: 'image'
    name: string
    mimeType: string
    dataUrl: string
  }>
}

export class SessionManager {
  private sessionsDir: string
  private sessionsCache: Map<string, { meta: ChatSession; messages: ChatMessage[] }> = new Map()
  /** 按 session ID 的写锁，防止并发写入导致数据损坏 */
  private writeLocks: Map<string, Promise<void>> = new Map()

  constructor() {
    const paths = getAppPaths()
    this.sessionsDir = paths.sessions
    this.loadAllSessions()
  }

  /**
   * 获取 session 的写锁，确保同一 session 的写操作串行执行
   */
  private async withLock<T>(sessionId: string, fn: () => Promise<T> | T): Promise<T> {
    const prev = this.writeLocks.get(sessionId)
    let release: () => void
    const next = new Promise<void>(resolve => { release = resolve })
    this.writeLocks.set(sessionId, next)

    if (prev) await prev
    try {
      return await fn()
    } finally {
      release!()
    }
  }

  /**
   * 加载所有会话到缓存
   */
  private loadAllSessions(): void {
    try {
      if (!fs.existsSync(this.sessionsDir)) {
        fs.mkdirSync(this.sessionsDir, { recursive: true })
        return
      }

      const files = fs.readdirSync(this.sessionsDir)
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const sessionPath = path.join(this.sessionsDir, file)
            const data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'))
            this.sessionsCache.set(data.meta.id, data)
          } catch (error) {
            logger.error(`加载会话失败: ${file}`, error as Error)
          }
        }
      }
    } catch (error) {
      logger.error('加载所有会话失败', error as Error)
    }
  }

  /**
   * 获取所有会话列表
   */
  getAllSessions(): ChatSession[] {
    const sessions: ChatSession[] = []
    for (const [, data] of this.sessionsCache) {
      sessions.push({ ...data.meta })
    }
    // 按更新时间倒序
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    return sessions
  }

  /**
   * 创建新会话
   */
  async createSession(title?: string): Promise<ChatSession> {
    const id = this.generateId()
    const now = new Date().toISOString()

    const session: ChatSession = {
      id,
      title: title || '新对话',
      createdAt: now,
      updatedAt: now,
      messageCount: 0
    }

    this.sessionsCache.set(id, { meta: session, messages: [] })
    this.saveSession(id)
    logger.info(`会话已创建: ${session.id} - ${session.title}`)
    return session
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.withLock(sessionId, () => {
    this.sessionsCache.delete(sessionId)

    const filePath = path.join(this.sessionsDir, `${sessionId}.json`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    logger.info(`会话已删除: ${sessionId}`)
    })
  }

  /**
   * 更新会话标题
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await this.withLock(sessionId, () => {
    const data = this.sessionsCache.get(sessionId)
    if (!data) throw new Error(`会话不存在: ${sessionId}`)

    data.meta.title = title
    data.meta.updatedAt = new Date().toISOString()
    this.saveSession(sessionId)
    })
  }

  /**
   * 获取会话的所有消息
   */
  getSessionMessages(sessionId: string): ChatMessage[] {
    const data = this.sessionsCache.get(sessionId)
    if (!data) {

      return []
    }
    return [...data.messages]
  }

  /**
   * 添加消息到会话
   */
  async addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    return await this.withLock(sessionId, async () => {
    const data = this.sessionsCache.get(sessionId)
    if (!data) throw new Error(`会话不存在: ${sessionId}`)

    const newMessage: ChatMessage = {
      id: this.generateId(),
      ...message,
      timestamp: new Date().toISOString()
    }

    data.messages.push(newMessage)
    data.meta.messageCount = data.messages.length
    data.meta.updatedAt = new Date().toISOString()

    // 自动更新标题（使用第一条用户消息）
    if (data.meta.title === '新对话' && message.role === 'user') {
      const title = message.content.trim() || (message.attachments?.length ? '图片对话' : '新对话')
      data.meta.title = title.slice(0, 30) + (title.length > 30 ? '...' : '')
    }

    this.saveSession(sessionId)
    return newMessage
    })
  }

  /**
   * 保存会话到磁盘
   */
  private saveSession(sessionId: string): void {
    const data = this.sessionsCache.get(sessionId)
    if (!data) return

    try {
      if (!fs.existsSync(this.sessionsDir)) {
        fs.mkdirSync(this.sessionsDir, { recursive: true })
      }

      const filePath = path.join(this.sessionsDir, `${sessionId}.json`)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      logger.error(`保存会话失败: ${sessionId}`, error as Error)
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }
}
