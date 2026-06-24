/**
 * 智语 Studio — RAG（检索增强生成）服务
 * 处理文档解析、文本分块、向量化存储和检索
 */
import fs from 'fs'
import path from 'path'
import { getAppPaths } from '../utils/paths'
import { logger } from '../utils/logger'
import { llamaService } from './llama-service'

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

export interface RagChunk {
  id: string
  docId: string
  content: string
  embedding?: number[]
  metadata?: any
}

export interface RagStats {
  totalDocs: number
  totalChunks: number
  totalSize: number
  knowledgeBases: string[]
}

export class RagService {
  private documentsDir: string
  private chunksDir: string
  private documents: RagDocument[] = []
  private chunks: Map<string, RagChunk[]> = new Map()

  constructor() {
    const paths = getAppPaths()
    this.documentsDir = paths.documents
    this.chunksDir = path.join(paths.userData, 'chunks')
    this.loadState()
  }

  /**
   * 加载持久化状态
   */
  private loadState(): void {
    try {
      const statePath = path.join(getAppPaths().userData, 'rag-state.json')
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'))
        this.documents = state.documents || []
        // 恢复 chunks
        if (state.chunks) {
          for (const [docId, chunks] of Object.entries(state.chunks)) {
            this.chunks.set(docId, chunks as RagChunk[])
          }
        }
      }
    } catch (error) {
      logger.error('加载 RAG 状态失败', error as Error)
    }
  }

  /**
   * 保存状态到磁盘
   */
  private saveState(): void {
    try {
      const statePath = path.join(getAppPaths().userData, 'rag-state.json')
      const state = {
        documents: this.documents,
        chunks: Object.fromEntries(this.chunks)
      }
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
    } catch (error) {
      logger.error('保存 RAG 状态失败', error as Error)
    }
  }

  /**
   * 上传并解析文档
   */
  async uploadDocument(filePath: string, kbName: string = '默认知识库'): Promise<RagDocument> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`)
    }

    const fileName = path.basename(filePath)
    const stat = fs.statSync(filePath)
    const ext = path.extname(fileName).toLowerCase()

    logger.info(`开始解析文档: ${fileName}`)

    // 解析文档文本
    let text: string

    switch (ext) {
      case '.txt':
      case '.md':
      case '.markdown':
        text = fs.readFileSync(filePath, 'utf-8')
        break
      case '.pdf':
        text = await this.parsePdf(filePath)
        break
      case '.docx':
        text = await this.parseDocx(filePath)
        break
      default:
        throw new Error(`不支持的文件格式: ${ext}。支持的格式: PDF, DOCX, TXT, Markdown`)
    }

    if (!text || text.trim().length === 0) {
      throw new Error('文档内容为空，无法处理')
    }

    // 分块
    const chunkTexts = this.chunkText(text, 512, 64)

    // 生成文档记录
    const docId = this.generateId()
    const document: RagDocument = {
      id: docId,
      fileName,
      filePath,
      fileType: ext.replace('.', ''),
      fileSize: stat.size,
      chunkCount: chunkTexts.length,
      uploadedAt: new Date().toISOString(),
      knowledgeBase: kbName
    }

    // 创建 chunks
    const chunks: RagChunk[] = chunkTexts.map((content, index) => ({
      id: `${docId}_chunk_${index}`,
      docId,
      content,
      metadata: { index, fileName, kbName }
    }))

    // 存储
    this.documents.push(document)
    this.chunks.set(docId, chunks)
    this.saveState()

    logger.info(`文档解析完成: ${fileName}, ${chunkTexts.length} 个文本块`)
    return document
  }

  /**
   * 获取所有文档
   */
  getDocuments(): RagDocument[] {
    return [...this.documents].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    )
  }

  /**
   * 删除文档及其所有块
   */
  async deleteDocument(docId: string): Promise<void> {
    this.documents = this.documents.filter(d => d.id !== docId)
    this.chunks.delete(docId)
    this.saveState()
    logger.info(`RAG 文档已删除: ${docId}`)
  }

  /**
   * 搜索知识库
   */
  async search(query: string, topK: number = 5): Promise<RagChunk[]> {
    const allChunks: RagChunk[] = []

    for (const [, chunks] of this.chunks) {
      allChunks.push(...chunks)
    }

    if (allChunks.length === 0) return []

    // 简单的关键词匹配搜索（无向量化时的降级方案）
    const scoredChunks = allChunks.map(chunk => {
      const score = this.simpleRelevanceScore(query, chunk.content)
      return { chunk, score }
    })

    // 按相关性排序
    scoredChunks.sort((a, b) => b.score - a.score)

    return scoredChunks.slice(0, topK).map(item => item.chunk)
  }

  /**
   * RAG 增强对话
   */
  async ragChat(query: string, messages: any[], options?: any): Promise<string> {
    // 1. 检索相关文档块
    const relevantChunks = await this.search(query, 5)

    // 2. 构建增强的上下文
    let enhancedPrompt = query

    if (relevantChunks.length > 0) {
      const context = relevantChunks
        .map((chunk, i) => {
          const doc = this.documents.find(d => d.id === chunk.docId)
          return `【参考文档 ${i + 1}】来源: ${doc?.fileName || '未知'}\n${chunk.content}`
        })
        .join('\n\n---\n\n')

      enhancedPrompt = `请基于以下参考资料回答用户问题。如果参考资料中没有相关信息，请如实告知。\n\n参考资料：\n${context}\n\n用户问题：${query}\n\n请回答：`
    }

    // 3. 构建完整消息列表
    const enhancedMessages = [
      { role: 'system', content: '你是一个基于知识库的智能助手。请仔细阅读参考资料，给出准确、详细的回答。' },
      ...messages.slice(-6),
      { role: 'user', content: enhancedPrompt }
    ]

    // 4. 使用 llamaService 实际生成回复
    const response = await llamaService.chat(enhancedMessages, options)
    return response || '生成回复失败，请稍后重试。'
  }

  /**
   * 获取知识库统计
   */
  getStats(): RagStats {
    const knowledgeBases = [...new Set(this.documents.map(d => d.knowledgeBase))]
    const totalChunks = Array.from(this.chunks.values()).reduce((sum, chunks) => sum + chunks.length, 0)
    const totalSize = this.documents.reduce((sum, doc) => sum + doc.fileSize, 0)

    return {
      totalDocs: this.documents.length,
      totalChunks,
      totalSize,
      knowledgeBases
    }
  }

  /**
   * 文本分块（滑动窗口）
   */
  private chunkText(text: string, chunkSize: number = 512, overlap: number = 64): string[] {
    const chunks: string[] = []

    // 先按段落分割
    const paragraphs = text.split(/\n\s*\n/)

    let currentChunk = ''

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())

        // 保留重叠部分
        currentChunk = currentChunk.slice(-overlap) + '\n\n' + paragraph
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  /**
   * 简单的关键词相关性评分（无向量化降级方案）
   */
  private simpleRelevanceScore(query: string, text: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/)
    const textLower = text.toLowerCase()

    let score = 0
    for (const term of queryTerms) {
      // 完全匹配
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      const matches = textLower.match(regex)
      if (matches) {
        score += matches.length * 10
      }

      // 部分匹配
      for (let i = 1; i < term.length; i++) {
        const subTerm = term.slice(0, i + 1)
        if (textLower.includes(subTerm)) {
          score += 0.5
        }
      }
    }

    return score
  }

  /**
   * 解析 PDF 文件
   */
  private async parsePdf(filePath: string): Promise<string> {
    try {
      // 动态导入 pdf-parse（避免在主进程中阻塞）
      const { default: parsePdf } = await import('pdf-parse')
      const dataBuffer = fs.readFileSync(filePath)
      const data = await parsePdf(dataBuffer)
      return data.text || ''
    } catch (error) {
      logger.error('PDF 解析失败，尝试简易读取', error as Error)
      // 降级：读取为原始文本（可能包含乱码但仍有部分可读内容）
      return fs.readFileSync(filePath, 'utf-8')
    }
  }

  /**
   * 解析 DOCX 文件
   */
  private async parseDocx(filePath: string): Promise<string> {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ path: filePath })
      return result.value || ''
    } catch (error) {
      logger.error('DOCX 解析失败', error as Error)
      return ''
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }
}
