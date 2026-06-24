/**
 * 智语 Studio — 设置服务
 * 管理应用配置的读取和持久化
 */
import fs from 'fs'
import { getAppPaths } from '../utils/paths'
import { logger } from '../utils/logger'

export interface AppSettings {
  /** 界面语言 */
  language: 'zh-CN' | 'en'
  /** 模型默认路径 */
  modelsPath: string
  /** 自动加载上一次的模型 */
  autoLoadLastModel: boolean
  /** 默认上下文大小 */
  defaultContextSize: number
  /** 默认温度 */
  defaultTemperature: number
  /** 默认 Top-P */
  defaultTopP: number
  /** 默认最大 Token */
  defaultMaxTokens: number
  /** GPU 层数 (-1=全部) */
  gpuLayers: number
  /** 线程数 */
  threads: number
  /** API 服务器端口 */
  apiPort: number
  /** API 服务器自动启动 */
  apiAutoStart: boolean
  /** 主题模式 */
  theme: 'light' | 'dark' | 'auto'
  /** 最后一次加载的模型路径 */
  lastModelPath: string | null
}

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
