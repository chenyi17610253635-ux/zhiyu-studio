/**
 * 智语 Studio — 模型下载服务
 * 支持断点续传和下载进度回调
 */
import fs from 'fs'
import path from 'path'
import { getAppPaths } from '../utils/paths'
import { logger } from '../utils/logger'

export interface DownloadProgress {
  modelId: string
  fileName: string
  downloaded: number
  total: number
  percentage: number
  speed: number
  status: 'downloading' | 'completed' | 'cancelled' | 'error'
}

export class DownloadService {
  private activeDownloads: Map<string, AbortController> = new Map()
  private progressCache: Map<string, DownloadProgress> = new Map()

  /**
   * 下载模型文件
   */
  async downloadModel(
    modelId: string,
    url: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    const modelsDir = getAppPaths().models
    const fileName = path.basename(url) || `${modelId.replace('/', '_')}.gguf`
    const filePath = path.join(modelsDir, fileName)

    // 检查是否已存在
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath)
      logger.info(`模型文件已存在: ${fileName} (${stat.size} 字节)`)
      if (onProgress) {
        onProgress({
          modelId, fileName,
          downloaded: stat.size,
          total: stat.size,
          percentage: 100,
          speed: 0,
          status: 'completed'
        })
      }
      return
    }

    const abortController = new AbortController()
    this.activeDownloads.set(modelId, abortController)

    try {
      // 构建 HuggingFace 下载 URL
      const downloadUrl = url.startsWith('http')
        ? url
        : `https://huggingface.co/${modelId}/resolve/main/${fileName}`

      logger.info(`开始下载: ${downloadUrl}`)

      const response = await fetch(downloadUrl, {
        signal: abortController.signal,
        headers: { 'Accept': '*/*' }
      })

      if (!response.ok) {
        throw new Error(`下载失败，HTTP ${response.status}: ${response.statusText}`)
      }

      const total = parseInt(response.headers.get('content-length') || '0', 10)
      const reader = response.body?.getReader()

      if (!reader) {
        throw new Error('无法读取响应数据流')
      }

      // 检查是否有部分下载的文件（断点续传）
      let downloaded = 0
      const tempPath = filePath + '.tmp'

      if (fs.existsSync(tempPath)) {
        downloaded = fs.statSync(tempPath).size
        logger.info(`断点续传: 已下载 ${downloaded} 字节`)
      }

      const writeStream = fs.createWriteStream(tempPath, {
        flags: downloaded > 0 ? 'a' : 'w'
      })

      let lastTime = Date.now()
      let lastDownloaded = downloaded

      const progress: DownloadProgress = {
        modelId,
        fileName,
        downloaded,
        total,  // content-length 已经是完整文件大小，不需要加 downloaded
        percentage: 0,
        speed: 0,
        status: 'downloading'
      }

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        writeStream.write(value)
        downloaded += value.length
        progress.downloaded = downloaded

        if (progress.total > 0) {
          progress.percentage = Math.round((downloaded / progress.total) * 100)
        }

        // 每秒更新一次进度
        const now = Date.now()
        const elapsed = now - lastTime

        if (elapsed >= 1000) {
          progress.speed = (downloaded - lastDownloaded) / (elapsed / 1000)
          lastDownloaded = downloaded
          lastTime = now
          this.progressCache.set(modelId, { ...progress })

          if (onProgress) {
            onProgress({ ...progress })
          }
        }
      }

      writeStream.close()

      // 重命名临时文件
      fs.renameSync(tempPath, filePath)

      progress.status = 'completed'
      progress.percentage = 100
      progress.speed = 0

      if (onProgress) {
        onProgress(progress)
      }

      logger.info(`模型下载完成: ${fileName}`)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.info(`下载已取消: ${modelId}`)
        if (onProgress) {
          const progress = this.progressCache.get(modelId)
          if (progress) {
            progress.status = 'cancelled'
            onProgress(progress)
          }
        }
      } else {
        logger.error(`下载失败: ${modelId}`, error)
        if (onProgress) {
          onProgress({
            modelId, fileName,
            downloaded: 0, total: 0,
            percentage: 0, speed: 0,
            status: 'error'
          })
        }
        throw error
      }
    } finally {
      this.activeDownloads.delete(modelId)
      this.progressCache.delete(modelId)
    }
  }

  /**
   * 取消下载
   */
  async cancelDownload(modelId: string): Promise<void> {
    const controller = this.activeDownloads.get(modelId)
    if (controller) {
      controller.abort()
      logger.info(`正在取消下载: ${modelId}`)
    }
  }

  /**
   * 获取下载进度
   */
  getProgress(modelId: string): DownloadProgress | undefined {
    return this.progressCache.get(modelId)
  }
}
