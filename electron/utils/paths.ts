/**
 * 智语 Studio — 工具函数：应用路径管理
 */
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export interface AppPaths {
  /** 用户数据根目录 (%APPDATA%/zhiyu-studio) */
  userData: string
  /** 模型存储目录 */
  models: string
  /** 会话存储目录 */
  sessions: string
  /** 文档存储目录 */
  documents: string
  /** 配置文件路径 */
  config: string
  /** 日志目录 */
  logs: string
  /** 数据库路径 */
  database: string
}

/**
 * 获取所有应用路径
 */
export function getAppPaths(): AppPaths {
  const userData = app.getPath('userData')

  return {
    userData,
    models: path.join(userData, 'models'),
    sessions: path.join(userData, 'sessions'),
    documents: path.join(userData, 'documents'),
    config: path.join(userData, 'config.json'),
    logs: path.join(userData, 'logs'),
    database: path.join(userData, 'zhiyu.db')
  }
}

/**
 * 确保所有必要目录存在
 */
export function ensureDirectories(): void {
  const paths = getAppPaths()
  const dirs = [
    paths.userData,
    paths.models,
    paths.sessions,
    paths.documents,
    paths.logs
  ]

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`已创建目录: ${dir}`)
    }
  }
}

/**
 * 获取 llama.cpp 可执行文件路径
 */
export function getLlamaBinaryPath(): string {
  const isDev = !app.isPackaged

  if (isDev) {
    // 开发模式：从 resources 目录获取
    return path.join(app.getAppPath(), 'resources', 'llama-bin')
  }

  // 生产模式：从 extraResources 获取
  return path.join(process.resourcesPath, 'llama-bin')
}

/**
 * 获取 llama.cpp server 可执行文件路径
 */
export function getLlamaServerPath(): string {
  const basePath = getLlamaBinaryPath()
  const ext = process.platform === 'win32' ? '.exe' : ''
  return path.join(basePath, `llama-server${ext}`)
}
