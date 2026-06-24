/**
 * 智语 Studio — 设置管理 IPC 处理器
 * 处理应用配置和 GPU 检测
 */
import { ipcMain } from 'electron'
import { SettingsService } from '../services/settings-service'
import { GPUDetector } from '../services/gpu-detector'
import { logger } from '../utils/logger'

const settingsService = new SettingsService()
const gpuDetector = new GPUDetector()

export function registerSettingsHandlers(): void {
  // 获取所有设置
  ipcMain.handle('settings:getAll', async () => {
    try {
      return settingsService.getAll()
    } catch (error) {
      logger.error('获取设置失败', error as Error)
      return {}
    }
  })

  // 更新设置
  ipcMain.handle('settings:update', async (_event, settings: any) => {
    try {
      await settingsService.update(settings)
      logger.info('设置已更新')
    } catch (error) {
      logger.error('更新设置失败', error as Error)
      throw error
    }
  })

  // 检测 GPU
  ipcMain.handle('settings:detectGPU', async () => {
    try {
      const gpuInfo = await gpuDetector.detect()
      logger.info(`GPU 检测完成: ${JSON.stringify(gpuInfo)}`)
      return gpuInfo
    } catch (error) {
      logger.error('GPU 检测失败', error as Error)
      return { hasGPU: false, devices: [] }
    }
  })
}
