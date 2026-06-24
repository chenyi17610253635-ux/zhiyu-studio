/**
 * 智语 Studio — 聊天推理 IPC 处理器
 * 处理模型加载、流式对话、会话管理等
 */
import { ipcMain, BrowserWindow } from 'electron'
import { llamaService, setOnProcessExit } from '../services/llama-service'
import { SessionManager } from '../services/session-manager'
import { logger } from '../utils/logger'


const sessionManager = new SessionManager()

export function registerChatHandlers(): void {
  // 注册 llama-server 退出回调，通知渲染进程更新模型状态
  setOnProcessExit((reason) => {
    const wins = BrowserWindow.getAllWindows()
    for (const win of wins) {
      if (!win.isDestroyed()) {
        win.webContents.send('model:unloaded', reason)
      }
    }
  })
  // 加载模型
  ipcMain.handle('chat:loadModel', async (_event, modelPath: string, config: any) => {
    try {
      const success = await llamaService.loadModel(modelPath, config)
      logger.info(`模型加载${success ? '成功' : '失败'}: ${modelPath}`)
      return success
    } catch (error) {
      logger.error('加载模型失败', error as Error)
      throw new Error((error as Error).message || '模型加载失败')
    }
  })

  // 卸载模型
  ipcMain.handle('chat:unloadModel', async () => {
    try {
      await llamaService.unloadModel()
      logger.info('模型已卸载')
    } catch (error) {
      logger.error('卸载模型失败', error as Error)
      throw error
    }
  })

  // 获取模型状态
  ipcMain.handle('chat:getModelStatus', async () => {
    return llamaService.getStatus()
  })

  // 流式对话
  ipcMain.handle('chat:stream', async (event, messages: any[], options?: any) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('无法获取窗口实例')

    try {
      let fullText = ''

      const generator = llamaService.streamChat(messages, options)
      for await (const chunk of generator) {
        fullText += chunk
        if (!win.isDestroyed()) {
          win.webContents.send('chat:streamToken', chunk)
        }
      }

      if (!win.isDestroyed()) {
        win.webContents.send('chat:streamDone', fullText)
      }

      return fullText
    } catch (error) {
      logger.error('流式对话出错', error as Error)
      if (!win.isDestroyed()) {
        win.webContents.send('chat:streamError', (error as Error).message)
      }
      throw error
    }
  })

  // ============ 会话管理 ============

  // 获取所有会话
  ipcMain.handle('chat:getSessions', async () => {
    try {
      return sessionManager.getAllSessions()
    } catch (error) {
      logger.error('获取会话列表失败', error as Error)
      return []
    }
  })

  // 创建新会话
  ipcMain.handle('chat:createSession', async (_event, title?: string) => {
    try {
      const session = sessionManager.createSession(title || '新对话')
      logger.info(`创建会话: ${session.id}`)
      return session
    } catch (error) {
      logger.error('创建会话失败', error as Error)
      throw error
    }
  })

  // 删除会话
  ipcMain.handle('chat:deleteSession', async (_event, sessionId: string) => {
    try {
      sessionManager.deleteSession(sessionId)
      logger.info(`删除会话: ${sessionId}`)
    } catch (error) {
      logger.error('删除会话失败', error as Error)
      throw error
    }
  })

  // 更新会话标题
  ipcMain.handle('chat:updateSessionTitle', async (_event, sessionId: string, title: string) => {
    try {
      sessionManager.updateSessionTitle(sessionId, title)
    } catch (error) {
      logger.error('更新会话标题失败', error as Error)
      throw error
    }
  })

  // 获取会话消息
  ipcMain.handle('chat:getSessionMessages', async (_event, sessionId: string) => {
    try {
      return sessionManager.getSessionMessages(sessionId)
    } catch (error) {
      logger.error('获取会话消息失败', error as Error)
      return []
    }
  })

  // 添加消息到会话
  ipcMain.handle('chat:addMessage', async (_event, sessionId: string, message: any) => {
    try {
      sessionManager.addMessage(sessionId, message)
    } catch (error) {
      logger.error('添加消息失败', error as Error)
      throw error
    }
  })
}

