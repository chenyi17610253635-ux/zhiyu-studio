/**
 * 智语 Studio — 设置状态管理 (Zustand)
 */
import { create } from 'zustand'
import type { AppSettings } from '../types'
import { settingsClient } from '../services/ipc-client'

interface SettingsState {
  settings: AppSettings
  isLoading: boolean

  loadSettings: () => Promise<void>
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    language: 'zh-CN',
    modelsPath: '',
    autoLoadLastModel: false,
    defaultContextSize: 32768,
    defaultTemperature: 0.7,
    defaultTopP: 0.9,
    defaultMaxTokens: 4096,
    gpuLayers: 0,
    threads: 4,
    apiPort: 1234,
    apiAutoStart: true,
    theme: 'light',
    lastModelPath: null
  },
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await settingsClient.getSettings()
      set({ settings })
    } catch (error) {
      console.error('加载设置失败:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  updateSettings: async (partial: Partial<AppSettings>) => {
    try {
      await settingsClient.updateSettings(partial)
      set(state => ({
        settings: { ...state.settings, ...partial }
      }))
    } catch (error) {
      console.error('更新设置失败:', error)
    }
  }
}))
