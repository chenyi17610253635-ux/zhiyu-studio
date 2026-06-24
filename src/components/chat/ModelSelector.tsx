/**
 * 智语 Studio — 模型选择器
 * 显示当前加载模型，快速切换或加载模型
 */
import { Select, Button, Space, Tag, Tooltip } from 'antd'
import { ReloadOutlined, LoadingOutlined, CheckCircleFilled } from '@ant-design/icons'
import { useModelStore } from '../../stores/model-store'
import { useChatStore } from '../../stores/chat-store'

export default function ModelSelector() {
  const { localModels, loadedModel, scanModels, loadModel, unloadModel, isScanning } = useModelStore()
  const { checkModelStatus } = useChatStore()

  const handleSelect = async (modelId: string) => {
    const model = localModels.find(m => m.id === modelId)
    if (model) {
      await loadModel(model)
      await checkModelStatus()
    }
  }

  const handleRefresh = async () => {
    await scanModels()
    await checkModelStatus()
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Select
        style={{ flex: 1 }}
        placeholder="选择模型..."
        value={loadedModel?.id || undefined}
        onChange={handleSelect}
        options={localModels.map(m => ({
          value: m.id,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{m.name}</span>
              <span style={{ fontSize: 11, color: '#999' }}>
                {m.parameters && `${m.parameters} `}
                {m.quantization && m.quantization}
              </span>
            </div>
          )
        }))}
        notFoundContent={
          <div style={{ padding: 8, textAlign: 'center', color: '#999' }}>
            {isScanning ? '扫描中...' : '暂无本地模型'}
          </div>
        }
        dropdownStyle={{ minWidth: 300 }}
      />

      <Tooltip title="刷新模型列表">
        <Button
          icon={isScanning ? <LoadingOutlined /> : <ReloadOutlined />}
          size="small"
          onClick={handleRefresh}
        />
      </Tooltip>

      {loadedModel && (
        <Tooltip title="卸载模型">
          <Button
            size="small"
            danger
            onClick={async () => {
              await unloadModel()
              await checkModelStatus()
            }}
          >
            卸载
          </Button>
        </Tooltip>
      )}

      {loadedModel && (
        <Tag icon={<CheckCircleFilled />} color="success" style={{ margin: 0 }}>
          已加载
        </Tag>
      )}
    </div>
  )
}
