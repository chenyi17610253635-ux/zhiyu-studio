/**
 * 智语 Studio — 根组件
 * 负责路由配置和全局初始化
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import MainLayout from './layouts/MainLayout'
import ChatPage from './pages/ChatPage'
import ModelsPage from './pages/ModelsPage'
import RAGPage from './pages/RAGPage'
import APIPage from './pages/APIPage'
import SettingsPage from './pages/SettingsPage'
import { useChatStore } from './stores/chat-store'
import { useModelStore } from './stores/model-store'
import { useSettingsStore } from './stores/settings-store'
import { useRagStore } from './stores/rag-store'

export default function App() {
  const loadSessions = useChatStore(s => s.loadSessions)
  const scanModels = useModelStore(s => s.scanModels)
  const detectGPU = useModelStore(s => s.detectGPU)
  const loadSettings = useSettingsStore(s => s.loadSettings)
  const loadDocuments = useRagStore(s => s.loadDocuments)

  // 应用初始化
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadSettings(),
        scanModels(),
        detectGPU(),
        loadSessions(),
        loadDocuments()
      ])
    }
    init()

    // 监听模型进程退出，自动刷新状态
    if (!(window as any).__modelUnloadRegistered) {
      ;(window as any).__modelUnloadRegistered = true
      window.zhiyuAPI.onModelUnloaded((reason: string) => {
        if (reason === 'crash') {
          // 异常崩溃：弹出警告，然后刷新状态
          useModelStore.getState().scanModels()
        } else {
          // 主动卸载或启动失败：正常清理状态
          useModelStore.getState().scanModels()
        }
      })
    }
  }, [])

    return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="rag" element={<RAGPage />} />
        <Route path="api" element={<APIPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

