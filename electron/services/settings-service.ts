/**
 * 智语 Studio — 设置服务
 * 管理应用配置的读取和持久化
 */
import fs from 'fs'
import type { AppSettings } from '../../src/types'
import { getAppPaths } from '../utils/paths'
import { logger } from '../utils/logger'

const DEFAULT_SETTINGS: AppSettings = {
  language: 'zh-CN',
  modelsPath: '',
  autoLoadLastModel: false,
  defaultContextSize: 32768,
  defaultTemperature: 0.7,
  defaultTopP: 0.9,
  defaultMaxTokens: 4096,
  gpuLayers: 99,
  threads: 8,
  apiPort: 1234,
  apiAutoStart: true,
  theme: 'light',
  lastModelPath: null
}

export class SettingsService {
  private settings: AppSettings
  private configPath: string

  constructor() {
    const paths = getAppPaths()
    this.configPath = paths.config
    this.settings = this.load()
  }

  /**
   * 从磁盘加载设置
   */
  private load(): AppSettings {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'))
        return { ...DEFAULT_SETTINGS, ...data }
      }
    } catch (error) {
      logger.error('加载设置失败，使用默认设置', error as Error)
    }
    return { ...DEFAULT_SETTINGS }
  }

  /**
   * 保存设置到磁盘
   */
  private save(): void {
    try {
      const dir = getAppPaths().userData
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2), 'utf-8')
    } catch (error) {
      logger.error('保存设置失败', error as Error)
    }
  }

/**
 * 获取所有设置
 */
  getAll(): AppSettings {
    return { ...this.settings }
  }

  /**
   * 更新设置（部分更新）
   */
  update(partial: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...partial }
    this.save()
    logger.info('设置已更新并保存')
  }

  /**
   * 获取单个设置项
   */
  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key]
  }
}

/** 全局唯一的 SettingsService 实例 */
export const settingsService = new SettingsService()
