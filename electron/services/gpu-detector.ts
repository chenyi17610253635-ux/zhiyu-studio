/**
 * 智语 Studio — GPU 检测服务
 * 检测系统中可用的 GPU 设备及其能力
 */
import { exec } from 'child_process'
import { logger } from '../utils/logger'

export interface GPUDevice {
  name: string
  vendor: string
  memoryMB: number
  driver?: string
  computeCapability?: string
  supportsCUDA?: boolean
  supportsVulkan?: boolean
  supportsROCm?: boolean
}

export interface GPUInfo {
  hasGPU: boolean
  devices: GPUDevice[]
  recommendedBackend: 'cuda' | 'vulkan' | 'metal' | 'cpu'
  totalMemoryMB: number
  detectionMethod: 'nvidia-smi' | 'vulkaninfo' | 'unknown'
}

export class GPUDetector {
  /**
   * 检测 GPU 信息
   */
  async detect(): Promise<GPUInfo> {
    // Windows 下优先检测 NVIDIA
    if (process.platform === 'win32') {
      try {
        return await this.detectNVIDIA()
      } catch {
        try {
          return await this.detectVulkan()
        } catch {
          return this.getCPUOnlyInfo()
        }
      }
    }

    // macOS 检测 Metal
    if (process.platform === 'darwin') {
      return this.detectAppleSilicon()
    }

    // Linux 检测 NVIDIA/AMD
    try {
      return await this.detectNVIDIA()
    } catch {
      try {
        return await this.detectAMD()
      } catch {
        return this.getCPUOnlyInfo()
      }
    }
  }

  /**
   * 通过 nvidia-smi 检测 NVIDIA GPU
   */
  private async detectNVIDIA(): Promise<GPUInfo> {
    return new Promise((resolve, reject) => {
      exec('nvidia-smi --query-gpu=name,memory.total,driver_version,compute_cap --format=csv,noheader,nounits', (error, stdout) => {
        if (error) {
          reject(error)
          return
        }

        const devices: GPUDevice[] = []
        const lines = stdout.trim().split('\n')

        for (const line of lines) {
          const parts = line.split(',').map(s => s.trim())
          if (parts.length >= 2) {
            devices.push({
              name: parts[0],
              vendor: 'NVIDIA',
              memoryMB: parseInt(parts[1], 10) || 0,
              driver: parts[2] || undefined,
              computeCapability: parts[3] || undefined,
              supportsCUDA: true,
              supportsVulkan: true
            })
          }
        }

        const result: GPUInfo = {
          hasGPU: devices.length > 0,
          devices,
          recommendedBackend: 'cuda',
          totalMemoryMB: devices.reduce((sum, d) => sum + d.memoryMB, 0),
          detectionMethod: 'nvidia-smi'
        }

        logger.info(`检测到 ${devices.length} 个 NVIDIA GPU, 总显存: ${result.totalMemoryMB}MB`)
        resolve(result)
      })
    })
  }

  /**
   * 通过 vulkaninfo 检测 Vulkan 设备
   */
  private async detectVulkan(): Promise<GPUInfo> {
    return new Promise((resolve, reject) => {
      exec('vulkaninfo --summary 2>&1', (error, stdout) => {
        if (error) {
          reject(error)
          return
        }

        const devices: GPUDevice[] = []
        const lines = stdout.split('\n')

        let currentDevice: Partial<GPUDevice> | null = null

        for (const line of lines) {
          if (line.includes('deviceName')) {
            if (currentDevice?.name) {
              devices.push(currentDevice as GPUDevice)
            }
            const name = line.split('=')[1]?.trim() || '未知 GPU'
            currentDevice = {
              name,
              vendor: '未知',
              memoryMB: 0,
              supportsVulkan: true
            }
          }
        }

        if (currentDevice?.name) {
          devices.push(currentDevice as GPUDevice)
        }

        const result: GPUInfo = {
          hasGPU: devices.length > 0,
          devices,
          recommendedBackend: 'vulkan',
          totalMemoryMB: devices.reduce((sum, d) => sum + d.memoryMB, 0),
          detectionMethod: 'vulkaninfo'
        }

        resolve(result)
      })
    })
  }

  /**
   * Apple Silicon 检测
   */
  private detectAppleSilicon(): GPUInfo {
    return {
      hasGPU: true,
      devices: [{
        name: 'Apple Silicon GPU',
        vendor: 'Apple',
        memoryMB: 0, // 统一内存，不单独计算
        supportsCUDA: false,
        supportsVulkan: false
      }],
      recommendedBackend: 'metal',
      totalMemoryMB: 0,
      detectionMethod: 'unknown'
    }
  }

  /**
   * AMD GPU 检测 (ROCm)
   */
  private async detectAMD(): Promise<GPUInfo> {
    return new Promise((resolve, reject) => {
      exec('rocm-smi --showproductname --showmeminfo vram 2>&1', (error) => {
        if (error) {
          reject(error)
          return
        }
        resolve({
          hasGPU: true,
          devices: [{ name: 'AMD GPU', vendor: 'AMD', memoryMB: 0, supportsROCm: true }],
          recommendedBackend: 'vulkan',
          totalMemoryMB: 0,
          detectionMethod: 'unknown'
        })
      })
    })
  }

  /**
   * CPU-only 模式
   */
  private getCPUOnlyInfo(): GPUInfo {
    logger.info('未检测到 GPU，将使用 CPU 推理模式')
    return {
      hasGPU: false,
      devices: [],
      recommendedBackend: 'cpu',
      totalMemoryMB: 0,
      detectionMethod: 'unknown'
    }
  }
}
