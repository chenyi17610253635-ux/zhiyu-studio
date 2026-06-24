/**
 * 智语 Studio — 模型管理页面
 * 本地模型管理 + HuggingFace 模型搜索下载
 */
import { useEffect } from 'react'
import { Tabs, Typography } from 'antd'
import { useModelStore } from '../stores/model-store'
import ModelCard from '../components/models/ModelCard'
import ModelDownload from '../components/models/ModelDownload'
import ModelConfig from '../components/models/ModelConfig'

const { Title } = Typography

export default function ModelsPage() {
  const { localModels, scanModels } = useModelStore()

  useEffect(() => {
    scanModels()
  }, [])

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
        <Title level={4} style={{ margin: 0 }}>模型管理</Title>
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
  )
}
