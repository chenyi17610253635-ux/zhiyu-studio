/**
 * 智语 Studio — 模型管理页面
 * 本地模型管理 + HuggingFace 模型搜索下载
 */
import { useEffect, useState } from 'react'
import { Tabs, Typography, Button, Space, Modal, Spin, message } from 'antd'
import { ReloadOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { useModelStore } from '../stores/model-store'
import { useSettingsStore } from '../stores/settings-store'
import ModelCard from '../components/models/ModelCard'
import ModelDownload from '../components/models/ModelDownload'
import ModelConfig from '../components/models/ModelConfig'

const { Title } = Typography

export default function ModelsPage() {
  const { localModels, scanModels, isLoadingModel, loadingModelName } = useModelStore()
  const { updateSettings } = useSettingsStore()
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    scanModels()
  }, [])

  const handleRefresh = async () => {
    setScanning(true)
    await scanModels()
    setScanning(false)
  }

  const handleSelectFolder = async () => {
    const dir = await window.zhiyuAPI.openDirectoryDialog()
    if (dir) {
      await updateSettings({ modelsPath: dir })
      message.success(`模型目录已设为: ${dir}`)
      handleRefresh()
    }
  }

  return (
    <>
      {/* 模型加载进度弹窗 */}
      <Modal
        open={isLoadingModel}
        closable={false}
        footer={null}
        centered
        width={400}
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600 }}>
            正在加载模型
          </div>
          <div style={{ marginTop: 8, color: '#999' }}>
            {loadingModelName}
          </div>
          <div style={{ marginTop: 16, color: '#bbb', fontSize: 12 }}>
            llama-server 正在启动，请稍候...
          </div>
        </div>
      </Modal>

    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 页头 */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Title level={4} style={{ margin: 0 }}>模型管理</Title>
        <Space>
          <Button icon={<FolderOpenOutlined />} onClick={handleSelectFolder}>
            选择模型目录
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={scanning}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        <Tabs
          defaultActiveKey="local"
          items={[
            {
              key: 'local',
              label: `本地模型 (${localModels.length})`,
              children: <ModelCard />
            },
            {
              key: 'download',
              label: '模型下载',
              children: <ModelDownload />
            },
            {
              key: 'config',
              label: '参数配置',
              children: <ModelConfig />
            }
          ]}
        />
      </div>
    </div>
    </>
  )
}
