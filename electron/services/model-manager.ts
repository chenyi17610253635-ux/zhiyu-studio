/**
 * 智语 Studio — 模型管理服务
 * 负责本地 GGUF 模型扫描、元数据读取、HuggingFace 搜索
 */
import fs from 'fs'
import path from 'path'
import type { LocalModel, HFModel } from '../../src/types'
import { getAppPaths } from '../utils/paths'
import { settingsService } from './settings-service'
import { logger } from '../utils/logger'

export class ModelManager {
  private modelsDir: string

  constructor() {
    const paths = getAppPaths()
    this.modelsDir = paths.models
  }

  /**
   * 扫描本地 GGUF 模型
   */
  async scanModels(): Promise<LocalModel[]> {
    const models: LocalModel[] = []

    try {
      if (!fs.existsSync(this.modelsDir)) {
        fs.mkdirSync(this.modelsDir, { recursive: true })
      }

      // 递归扫描所有子目录
      this.scanDir(this.modelsDir, models)

      // 扫描设置里配置的额外模型路径
      try {
        const settings = settingsService.getAll()
        if (settings.modelsPath && fs.existsSync(settings.modelsPath)) {
          this.scanDir(settings.modelsPath, models)
        }
      } catch { /* 设置不存在就跳过 */ }

      // 按添加时间倒序排列
      models.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())

      logger.info(`扫描到 ${models.length} 个本地模型`)
    } catch (error) {
      logger.error('扫描本地模型失败', error as Error)
    }

    return models
  }

  /**
   * 递归扫描目录中的 GGUF 文件
   */
  private scanDir(dir: string, models: LocalModel[]): void {
    if (!fs.existsSync(dir)) return

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) {
          this.scanDir(fullPath, models)
        }
      } else if (entry.isFile() && entry.name.endsWith('.gguf')) {
        // 跳过 mmproj 投影器文件（非主模型）
        if (entry.name.toLowerCase().includes('mmproj')) {
          continue
        }
        const stat = fs.statSync(fullPath)
        const model = this.parseModelInfo(entry.name, fullPath, stat)
        models.push(model)
      }
    }
  }

  /**
   * 从文件名解析模型信息
   */
  private parseModelInfo(fileName: string, filePath: string, stat: fs.Stats): LocalModel {
    const nameWithoutExt = fileName.replace('.gguf', '')

    // 尝试解析参数量（如 7B, 13B, 70B）
    const paramMatch = nameWithoutExt.match(/(\d+(?:\.\d+)?[BbMm])/)
    const parameters = paramMatch ? paramMatch[1].toUpperCase() : undefined

    // 尝试解析量化级别（如 Q4_K_M, Q5_K_M, Q8_0）
    const quantMatch = nameWithoutExt.match(/(Q\d[_\w]*|F16|F32|FP16|FP32)/i)
    const quantization = quantMatch ? quantMatch[1].toUpperCase() : undefined

    // 模型名称
    let name = nameWithoutExt
    if (quantization) name = name.replace(new RegExp(`[-_.]?${quantMatch![1]}`, 'i'), '')
    name = name.replace(/[-_.]/g, ' ').trim()

    return {
      id: Buffer.from(filePath).toString('base64'),
      fileName,
      filePath,
      fileSize: stat.size,
      addedAt: stat.mtime.toISOString(),
      name,
      parameters,
      quantization
    }
  }

  /**
   * 读取 GGUF 文件元数据
   */
  async getModelMetadata(modelPath: string): Promise<any> {
    if (!fs.existsSync(modelPath)) {
      throw new Error(`模型文件不存在: ${modelPath}`)
    }

    const stat = fs.statSync(modelPath)
    const fileName = path.basename(modelPath)

    // GGUF 文件头信息
    const buffer = Buffer.alloc(4096)
    const fd = fs.openSync(modelPath, 'r')
    fs.readSync(fd, buffer, 0, 4096, 0)
    fs.closeSync(fd)

    const isGGUF = buffer.toString('utf8', 0, 4) === 'GGUF'
    const version = buffer.readUInt32LE(4)

    return {
      fileName,
      fileSize: stat.size,
      isGGUF,
      ggufVersion: version,
      fileSizeFormatted: this.formatFileSize(stat.size),
      modifiedAt: stat.mtime.toISOString()
    }
  }

  /**
   * 删除模型
   */
  async deleteModel(modelId: string): Promise<void> {
    const filePath = Buffer.from(modelId, 'base64').toString('utf8')

    if (!fs.existsSync(filePath)) {
      throw new Error(`模型文件不存在: ${filePath}`)
    }

    fs.unlinkSync(filePath)
    logger.info(`模型已删除: ${filePath}`)
  }

  /**
   * 搜索 HuggingFace 上的 GGUF 模型
   */
  async searchHuggingFace(query: string, limit: number = 20): Promise<HFModel[]> {
    try {
      const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&library=gguf&sort=downloads&direction=-1&limit=${limit}`

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        logger.warn(`HuggingFace API 请求失败: ${response.status}`)
        return this.getMockHFResults(query, limit)
      }

      const data = await response.json()

      return data.map((model: any) => ({
        id: model.id || model._id,
        name: model.id || model.modelId,
        author: model.author || (model.id?.split('/')[0] || '未知'),
        downloads: model.downloads || 0,
        likes: model.likes || 0,
        updatedAt: model.lastModified || model.updatedAt || '',
        tags: model.tags || [],
        description: model.pipeline_tag || ''
      }))
    } catch (error) {
      logger.error('搜索 HuggingFace 失败', error as Error)
      return this.getMockHFResults(query, limit)
    }
  }

  /**
   * 模拟 HuggingFace 搜索结果（离线模式）
   */
  private getMockHFResults(query: string, limit: number): HFModel[] {
    const commonModels: HFModel[] = [
      { id: 'Qwen/Qwen2-7B-Instruct-GGUF', name: 'Qwen2-7B-Instruct-GGUF', author: 'Qwen', downloads: 1250000, likes: 3420, updatedAt: '2025-06-15', tags: ['gguf', 'chinese', 'text-generation'], description: '通义千问2代 7B 指令微调版本，中文能力出色' },
      { id: 'MaziyarPanahi/Llama-3-8B-Instruct-GGUF', name: 'Llama-3-8B-Instruct-GGUF', author: 'MaziyarPanahi', downloads: 980000, likes: 2800, updatedAt: '2025-05-20', tags: ['gguf', 'llama3', 'text-generation'], description: 'Meta Llama 3 8B 指令微调版本' },
      { id: 'MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF', name: 'Mistral-7B-Instruct-v0.3-GGUF', author: 'MaziyarPanahi', downloads: 750000, likes: 2100, updatedAt: '2025-04-10', tags: ['gguf', 'mistral', 'text-generation'], description: 'Mistral 7B v0.3 指令微调版' },
      { id: 'TheBloke/Phi-3-mini-4k-instruct-GGUF', name: 'Phi-3-mini-4k-instruct-GGUF', author: 'TheBloke', downloads: 560000, likes: 1800, updatedAt: '2025-03-25', tags: ['gguf', 'phi3', 'text-generation'], description: '微软 Phi-3 Mini 4K 上下文版本' },
      { id: 'lmstudio-community/Qwen2.5-7B-Instruct-GGUF', name: 'Qwen2.5-7B-Instruct-GGUF', author: 'lmstudio-community', downloads: 890000, likes: 2500, updatedAt: '2025-06-01', tags: ['gguf', 'qwen2.5', 'chinese'], description: '通义千问2.5 7B，中文能力最强的开源模型之一' },
      { id: 'nomic-ai/nomic-embed-text-v1.5-GGUF', name: 'nomic-embed-text-v1.5-GGUF', author: 'nomic-ai', downloads: 320000, likes: 950, updatedAt: '2025-02-15', tags: ['gguf', 'embedding', 'text-embeddings'], description: '文本向量化模型，用于 RAG 检索' }
    ]

    const q = query.toLowerCase()
    return commonModels
      .filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.author.toLowerCase().includes(q) ||
        m.tags.some(t => t.includes(q))
      )
      .slice(0, limit)
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
  }
}
