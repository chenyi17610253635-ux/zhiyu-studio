/**
 * 智语 Studio — 设置页面
 */
import { useEffect, useState } from 'react'
import {
  Form, Card, Select, Switch, InputNumber, Input, Button,
  Space, Typography, Divider, Descriptions, Tag, Alert,
  Spin, Progress, message as antMsg
} from 'antd'
import {
  SaveOutlined,
  GithubOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import { useSettingsStore } from '../stores/settings-store'
import { useModelStore } from '../stores/model-store'

const { Title, Text, Paragraph } = Typography

export default function SettingsPage() {
  const { settings, isLoading, loadSettings, updateSettings } = useSettingsStore()
  const { gpuInfo, detectGPU } = useModelStore()
  const [form] = Form.useForm()
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    loadSettings()
    detectGPU()
  }, [])

  useEffect(() => {
    form.setFieldsValue(settings)
  }, [settings])

  const handleSave = () => {
    const values = form.getFieldsValue()
    updateSettings(values)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 页头 */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Title level={4} style={{ margin: 0 }}>设置</Title>
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        <div style={{ maxWidth: 720 }}>
          <Spin spinning={isLoading}>
            <Form
              form={form}
              layout="vertical"
              initialValues={settings}
            >
              {/* 通用设置 */}
              <Card title="通用设置" style={{ marginBottom: 16 }}>
                <Form.Item name="language" label="界面语言">
                  <Select
                    options={[
                      { value: 'zh-CN', label: '中文' },
                      { value: 'en', label: 'English' }
                    ]}
                  />
                </Form.Item>

<Form.Item
                  name="autoLoadLastModel"
                  label="启动时自动加载上次模型"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Card>

              {/* API 设置 */}
              <Card title="API 服务设置" style={{ marginBottom: 16 }}>
                <Form.Item name="apiPort" label="API 服务端口">
                  <InputNumber
                    min={1024}
                    max={65535}
                    addonAfter="端口"
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item
                  name="apiAutoStart"
                  label="启动时自动开启 API 服务"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Card>

              {/* 外观设置 */}
              <Card title="外观设置" style={{ marginBottom: 16 }}>
                <Form.Item name="theme" label="主题模式">
                  <Select
                    options={[
                      { value: 'light', label: '浅色' },
                      { value: 'dark', label: '深色' },
                      { value: 'auto', label: '跟随系统' }
                    ]}
                  />
                </Form.Item>
              </Card>

              {/* GPU 信息 */}
              <Card title="系统信息" style={{ marginBottom: 16 }}>
                {gpuInfo ? (
                  gpuInfo.hasGPU ? (
                    <Descriptions column={1} size="small">
                      {gpuInfo.devices.map((device, i) => (
                        <Descriptions.Item key={i} label="GPU 设备">
                          {device.name}
                          <Tag color="green" style={{ marginLeft: 8 }}>
                            {device.memoryMB}MB 显存
                          </Tag>
                          {device.supportsCUDA && <Tag color="blue">CUDA</Tag>}
                          {device.supportsVulkan && <Tag color="purple">Vulkan</Tag>}
                        </Descriptions.Item>
                      ))}
                      <Descriptions.Item label="推荐后端">
                        <Tag color="blue">{gpuInfo.recommendedBackend.toUpperCase()}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="检测方式">
                        {gpuInfo.detectionMethod}
                      </Descriptions.Item>
                    </Descriptions>
                  ) : (
                    <Alert
                      type="info"
                      showIcon
                      message="未检测到 GPU"
                      description="将使用纯 CPU 推理模式。如需 GPU 加速，请安装 NVIDIA CUDA 驱动或 Vulkan 运行时。"
                    />
                  )
                ) : (
                  <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>
                    <Spin size="small" /> 检测中...
                  </div>
                )}
              </Card>

              {/* 保存 */}
              <div style={{ textAlign: 'right', marginBottom: 24 }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  size="large"
                  onClick={handleSave}
                >
                  保存设置
                </Button>
              </div>

              {/* 关于 */}
              <Card title="关于智语 Studio" style={{ marginBottom: 16 }}>
                <Paragraph style={{ fontSize: 14, color: '#666' }}>
                  智语 Studio 是一款 100% 中文化的本地大语言模型桌面应用。
                  基于 llama.cpp 提供高性能本地推理，支持 RAG 知识库检索增强和 OpenAI 兼容 API。
                  所有数据完全离线处理，保护您的隐私安全。
                </Paragraph>

                <Space>
                  <Button icon={<GithubOutlined />} onClick={() => window.open('https://github.com/chenyi17610253635-ux/zhiyu-studio')}>
                    项目地址
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={async () => {
                    antMsg.loading({ content: '检查更新中...', key: 'update', duration: 0 })
                    try {
                      const version = await window.zhiyuAPI.checkUpdate()
                      antMsg.destroy('update')
                      if (version) {
                        antMsg.destroy('update')
                        setDownloading(true)
                        setDownloadProgress(0)
                        window.zhiyuAPI.onUpdateProgress((p) => setDownloadProgress(p))
                        window.zhiyuAPI.onUpdateDownloaded(() => {
                          setDownloading(false)
                          antMsg.success('更新已下载，点击确定立即安装', 10000)
                            .then(() => window.zhiyuAPI.installUpdate())
                        })
                        window.zhiyuAPI.downloadUpdate()
                      } else {
                        antMsg.success('已是最新版本')
                      }
                    } catch {
                      antMsg.destroy('update')
                      antMsg.info('自动更新仅在安装版可用，请前往 GitHub 下载新版')
                    }
                  }}>
                    检查更新
                  </Button>
                </Space>

                {downloading && (
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary">正在下载更新...</Text>
                    <Progress percent={Math.round(downloadProgress)} />
                  </div>
                )}

                <Divider />

                <Text type="secondary" style={{ fontSize: 12 }}>
                  版本: 1.0.0 · 平台: Windows · 基于 Electron + React + llama.cpp 构建
                </Text>
              </Card>
            </Form>
          </Spin>
        </div>
      </div>
    </div>
  )
}
