/**
 * 智语 Studio — React 渲染入口
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ConfigProvider, App as AntdApp, theme as antTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useSettingsStore } from './stores/settings-store'
import App from './App'
import './assets/global.css'

/** 主题感知的配置提供器，从 Zustand store 读取主题设置 */
function ThemedApp() {
  const currentTheme = useSettingsStore(s => s.settings.theme)

  const themeConfig = React.useMemo(() => {
    const isDark = currentTheme === 'dark' ||
      (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    return {
      token: {
        colorPrimary: '#1677ff',
        borderRadius: 8,
        fontSize: 14
      },
      algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm
    }
  }, [currentTheme])

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <ThemedApp />
    </HashRouter>
  </React.StrictMode>
)
