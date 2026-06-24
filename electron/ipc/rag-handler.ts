/**
 * 智语 Studio — RAG 知识库 IPC 处理器
 * 处理文档上传、向量化、检索增强生成
 */
import { ipcMain } from 'electron'
import { RagService } from '../services/rag-service'
import { logger } from '../utils/logger'

const ragService = new RagService()

export function registerRagHandlers(): void {
  // 上传文档到知识库
  ipcMain.handle('rag:uploadDocument', async (_event, filePath: string, kbName?: string) => {
    try {
      const result = await ragService.uploadDocument(filePath, kbName)
      logger.info(`文档已上传: ${result.fileName}`)
      return result
    } catch (error) {
      logger.error('文档上传失败', error as Error)
      throw error
    }
  })

  // 获取所有文档
  ipcMain.handle('rag:getDocuments', async () => {
    try {
      return ragService.getDocuments()
    } catch (error) {
      logger.error('获取文档列表失败', error as Error)
      return []
    }
  })

  // 删除文档
  ipcMain.handle('rag:deleteDocument', async (_event, docId: string) => {
    try {
      await ragService.deleteDocument(docId)
      logger.info(`文档已删除: ${docId}`)
    } catch (error) {
      logger.error('删除文档失败', error as Error)
      throw error
    }
  })

  // 搜索知识库
  ipcMain.handle('rag:search', async (_event, query: string, topK: number = 5) => {
    try {
      const results = await ragService.search(query, topK)
      return results
    } catch (error) {
      logger.error('知识库搜索失败', error as Error)
      return []
    }
  })

  // RAG 增强对话
  ipcMain.handle('rag:chat', async (_event, query: string, messages: any[], options?: any) => {
    try {
      const result = await ragService.ragChat(query, messages, options)
      return result
    } catch (error) {
      logger.error('RAG 对话失败', error as Error)
      throw error
    }
  })

  // 获取知识库统计
  ipcMain.handle('rag:getStats', async () => {
    try {
      return ragService.getStats()
    } catch (error) {
      logger.error('获取知识库统计失败', error as Error)
      return { totalDocs: 0, totalChunks: 0, totalSize: 0 }
    }
  })
}
