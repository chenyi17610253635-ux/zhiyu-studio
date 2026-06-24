/**
 * 智语 Studio — 日志工具
 * 提供统一的日志记录，支持文件和控制台输出
 */
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const
type LogLevel = typeof LOG_LEVELS[number]

class Logger {
  private logFilePath: string
  private level: LogLevel = 'info'
  private initialized = false

  constructor() {
    this.logFilePath = ''
  }

  private ensureInit(): void {
    if (this.initialized) return
    this.initialized = true
    try {
      const userData = require('electron').app.getPath('userData')
      this.logFilePath = path.join(userData, 'logs', 'app.log')
      const dir = path.dirname(this.logFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    } catch {
      // app not ready yet, console-only mode
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`
  }

  private write(level: LogLevel, message: string): void {
    if (LOG_LEVELS.indexOf(level) < LOG_LEVELS.indexOf(this.level)) return

    this.ensureInit()
    const formatted = this.formatMessage(level, message)

    // 控制台输出（捕获 EPIPE，防止子进程退出时管道断裂崩溃）
    try {
      switch (level) {
        case 'error':
          console.error(formatted)
          break
        case 'warn':
          console.warn(formatted)
          break
        default:
          console.log(formatted)
      }
    } catch {
      // stdout/stderr pipe broken - silently ignore
    }

    // 写入文件
    try {
      fs.appendFileSync(this.logFilePath, formatted + '\n')
    } catch {
      // 写日志失败时静默处理，避免循环
    }
  }

  debug(message: string): void {
    this.write('debug', message)
  }

  info(message: string): void {
    this.write('info', message)
  }

  warn(message: string): void {
    this.write('warn', message)
  }

  error(message: string, error?: Error): void {
    const msg = error ? `${message}: ${error.message}\n${error.stack}` : message
    this.write('error', msg)
  }
}

export const logger = new Logger()
