/**
 * 智语 Studio — 模型管理 IPC 处理器
 * 处理模型的扫描、下载、删除等操作
 */
import { ipcMain, BrowserWindow } from 'electron'
import { ModelManager } from '../services/model-manager'
import { DownloadService } from '../services/download-service'
import { logger } from '../utils/logger'
import path from 'path'
import fs from 'fs'

const modelManager = new ModelManager()
const downloadService = new DownloadService()

export function registerModelHandlers(): void {
  // 扫描本地模型
  ipcMain.handle('model:scan', async () => {
    try {
      const models = await modelManager.scanModels()
      logger.info(`扫描到 ${models.length} 个本地模型`)
      return models
    } catch (error) {
      logger.error('扫描模型失败', error as Error)
      return []
    }
  })

  // 获取模型详细信息
  ipcMain.handle('model:getInfo', async (_event, modelPath: string) => {
    try {
      return await modelManager.getModelMetadata(modelPath)
    } catch (error) {
      logger.error('获取模型信息失败', error as Error)
      throw error
    }
  })

  // 删除模型
  ipcMain.handle('model:delete', async (_event, modelId: string) => {
    try {
      await modelManager.deleteModel(modelId)
      logger.info(`模型已删除: ${modelId}`)
      return true
    } catch (error) {
      logger.error('删除模型失败', error as Error)
      throw error
    }
  })

  // 搜索 HuggingFace 模型
  ipcMain.handle('model:searchHF', async (_event, query: string, limit: number = 20) => {
    try {
      const results = await modelManager.searchHuggingFace(query, limit)
      logger.info(`搜索 "${query}" 找到 ${results.length} 个模型`)
      return results
    } catch (error) {
      logger.error('搜索 HuggingFace 模型失败', error as Error)
      return []
    }
  })

  // 下载模型
  ipcMain.handle('model:download', async (event, modelId: string, url: string) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      await downloadService.downloadModel(modelId, url, (progress) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('model:downloadProgress', progress)
        }
      })
      logger.info(`模型下载完成: ${modelId}`)
    } catch (error) {
      logger.error('模型下载失败', error as Error)
      throw error
    }
  })

  // 取消下载
  ipcMain.handle('model:cancelDownload', async (_event, modelId: string) => {
    try {
      await downloadService.cancelDownload(modelId)
      logger.info(`下载已取消: ${modelId}`)
    } catch (error) {
      logger.error('取消下载失败', error as Error)
      throw error
    }
  })

  // 自动检测匹配的 mmproj 文件
  ipcMain.handle('model:detectMmproj', async (_event, modelPath: string) => {
    try {
      const dir = path.dirname(modelPath)
      const baseName = path.basename(modelPath, '.gguf')
      const files = fs.readdirSync(dir).filter(f => f.toLowerCase().includes('mmproj') && f.endsWith('.gguf'))

      if (files.length === 0) return null

      // 提取模型名中的版本大小号（如 9B、27B、35B）
      const modelSize = baseName.match(/(\d+)[bB]/)?.[1]

      // 优先：文件名前缀匹配
      const parts = baseName.split(/[-_]/).filter(s => s.length > 2)
      for (const file of files) {
        const fileBase = path.basename(file, '.gguf').toLowerCase()
        const matchCount = parts.filter(p => fileBase.includes(p.toLowerCase())).length
        if (matchCount >= 2) {
          // 确认大小号匹配，避免不同版本（如 9B 与 27B）误配
          const fileSize = fileBase.match(/(\d+)[bB]/)?.[1]
          if (!modelSize || !fileSize || modelSize === fileSize) {
            return path.join(dir, file)
          }
        }
      }

      // 次优：按模型家族 + 参数大小评分匹配
      const baseNameLower = baseName.toLowerCase()
      const families = ['gemma', 'qwen', 'llama', 'mistral', 'phi', 'deepseek']
      let bestScore = 0
      let bestMatch: string | null = null
      for (const file of files) {
        const fileBase = path.basename(file, '.gguf').toLowerCase()
        let score = 0
        // 家族匹配 +3
        for (const fam of families) {
          if (baseNameLower.includes(fam) && fileBase.includes(fam)) {
            score += 3
            break
          }
        }
        // 参数大小匹配（精确 +5，不同型号减分）
        const fileSize = fileBase.match(/(\d+)[bB]/)?.[1]
        if (modelSize && fileSize) {
          if (modelSize === fileSize) {
            score += 5
          } else {
            score -= 5  // 型号不同，强烈惩罚
          }
        }
        // 部分匹配 +1
        const matchCount = parts.filter(p => fileBase.includes(p.toLowerCase())).length
        score += matchCount
        if (score > bestScore) {
          bestScore = score
          bestMatch = file
        }
      }
      if (bestMatch && bestScore > 0) return path.join(dir, bestMatch)

      // 没有可靠匹配的 mmproj，返回 null（用户可在设置中手动指定）
      return null
    } catch (error) {
      logger.error('检测 mmproj 失败', error as Error)
      return null
    }
  })
}

