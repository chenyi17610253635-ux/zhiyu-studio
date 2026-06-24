/**
 * 智语 Studio — 底部状态栏
 * 显示模型状态、GPU信息和API服务器状态
 */
import { useEffect, useState } from 'react'
import { useChatStore } from '../../stores/chat-store'
import { useModelStore } from '../../stores/model-store'
import { serverClient, appClient } from '../../services/ipc-client'

export default function StatusBar() {
  const isModelLoaded = useChatStore(s => s.isModelLoaded)
  const loadedModel = useModelStore(s => s.loadedModel)
  const gpuInfo = useModelStore(s => s.gpuInfo)
  const [serverStatus, setServerStatus] = useState({ isRunning: false, port: 1234 })
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    const checkServer = async () => {
      try {
        const status = await serverClient.getStatus()
        setServerStatus(status)
      } catch { /* ignore */ }
    }
    checkServer()
    const interval = setInterval(checkServer, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    appClient.getVersion().then(v => setAppVersion(v)).catch(() => {})
  }, [])

  return (
    <div className="status-bar">
      {/* 模型状态 */}
      <div className="status-item">
        <span className={`status-dot ${isModelLoaded ? 'active' : 'inactive'}`} />
        <span>
          模型: {isModelLoaded && loadedModel ? loadedModel.name : '未加载'}
        </span>
      </div>

      {/* GPU 信息 */}
      {gpuInfo && (
        <div className="status-item">
          <span>
            GPU: {gpuInfo.hasGPU
              ? `${gpuInfo.devices[0]?.name || '未知'} (${gpuInfo.totalMemoryMB}MB)`
              : '未检测到'}
          </span>
        </div>
      )}

      {/* API 服务状态 */}
      <div className="status-item">
        <span className={`status-dot ${serverStatus.isRunning ? 'active' : 'inactive'}`} />
        <span>
          API: {serverStatus.isRunning ? `已开启 (:${serverStatus.port})` : '已关闭'}
        </span>
      </div>

      {/* 右侧占位 */}
      <div style={{ flex: 1 }} />

      {appVersion && (
        <div className="status-item" style={{ color: '#999' }}>
          <span>v{appVersion}</span>
        </div>
      )}
    </div>
  )
}
