/**
 * 智语 Studio — Electron 主进程入口
 * 负责窗口管理、IPC通信、服务生命周期管理
 */
import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { autoUpdater } from 'electron-updater'
import { logger } from './utils/logger'
import { getAppPaths, ensureDirectories } from './utils/paths'
import { registerModelHandlers } from './ipc/model-handler'
import { registerChatHandlers } from './ipc/chat-handler'
import { registerRagHandlers } from './ipc/rag-handler'
import { registerSettingsHandlers } from './ipc/settings-handler'
import { AppSettings } from './services/settings-service'
import { SettingsService } from './services/settings-service'
import { APIServer } from './ipc/api-server'

let mainWindow: BrowserWindow | null = null
let apiServer: APIServer | null = null

const iconPath = path.join(__dirname, '../resources/icon.ico')

// 禁止多实例运行
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: '智语 Studio',
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#f5f5f5',
    ...(process.platform === 'win32' && fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    frame: true,
    titleBarStyle: 'default'
  })

  // 窗口准备好后再显示，避免白屏闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    logger.info('主窗口已显示')
  })

  // 外部链接用默认浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 开发模式加载 Vite dev server，生产模式加载打包文件
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  logger.info('主窗口已创建')
}

// 初始化应用
async function initApp(): Promise<void> {
  logger.info('智语 Studio 正在启动...')

  // 确保数据目录存在
  const paths = getAppPaths()
  await ensureDirectories()

  logger.info(`数据目录: ${paths.userData}`)
  logger.info(`模型目录: ${paths.models}`)
  logger.info(`会话目录: ${paths.sessions}`)
  logger.info(`文档目录: ${paths.documents}`)

  // 注册 IPC 处理器
  registerModelHandlers()
  registerChatHandlers()
  registerRagHandlers()
  registerSettingsHandlers()

  logger.info('IPC 处理器已注册')
}

// 启动本地 API 服务器
async function startAPIServer(): Promise<void> {
  apiServer = new APIServer()
  await apiServer.start()
  logger.info('本地 API 服务器已启动')
}

// ============ 应用生命周期 ============

let storedSettings: AppSettings | null = null

function getSettings(): AppSettings {
  if (!storedSettings) {
    storedSettings = new SettingsService().getAll()
  }
  return storedSettings
}

app.whenReady().then(async () => {
  await initApp()
  createWindow()
  // 根据设置决定是否启动 API 服务
  const settings = getSettings()
  if (settings.apiAutoStart) {
    await startAPIServer()
  }

  // macOS: 点击 dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// === 自动更新 ===
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.on('update-available', (info) => {
  logger.info(`发现新版本: ${info.version}`)
  BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('update:available', info.version) })
})
autoUpdater.on('download-progress', (p) => {
  BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('update:progress', p.percent) })
})
autoUpdater.on('update-downloaded', () => {
  BrowserWindow.getAllWindows().forEach(w => { if (!w.isDestroyed()) w.webContents.send('update:downloaded') })
})
ipcMain.handle('update:check', async () => {
  const result = await autoUpdater.checkForUpdates()
  return result?.updateInfo?.version || null
})
ipcMain.handle('update:download', async () => {
  autoUpdater.downloadUpdate()
})
ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall()
})

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 退出前清理
app.on('before-quit', async () => {
  logger.info('应用正在退出...')
  if (apiServer) {
    await apiServer.stop()
  }
})

// 第二个实例启动时，聚焦主窗口
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// ============ 通用 IPC 处理器 ============

// 打开文件选择对话框
ipcMain.handle('dialog:openFile', async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'GGUF 模型文件', extensions: ['gguf'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})

// 打开文件夹选择对话框
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})

// 在文件管理器中打开模型目录
ipcMain.handle('app:openModelsFolder', async () => {
  const { getAppPaths } = require('./utils/paths')
  const paths = getAppPaths()
  shell.openPath(paths.models)
})

// 获取应用路径信息
ipcMain.handle('app:getPaths', () => {
  return getAppPaths()
})

// 获取应用版本
ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

// ============ 服务器 IPC 处理器 ============

ipcMain.handle('server:getStatus', () => {
  return apiServer ? apiServer.getStatus() : { isRunning: false, port: 1234, address: 'http://127.0.0.1:1234' }
})

ipcMain.handle('server:toggle', async (_event, enable: boolean) => {
  if (enable && !apiServer?.getStatus().isRunning) {
    await startAPIServer()
  } else if (!enable && apiServer?.getStatus().isRunning) {
    await apiServer?.stop()
  }
})

ipcMain.handle('server:getPort', () => {
  return apiServer?.getPort() || 1234
})
