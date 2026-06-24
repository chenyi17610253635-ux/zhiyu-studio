/**
 * 智语 Studio — 模型卡片列表
 * 展示本地 GGUF 模型，支持加载/卸载/删除
 */
import { useState } from 'react'
import {
  Card, Row, Col, Button, Tag, Space, Empty, Popconfirm,
  Progress, Tooltip, Typography, Modal
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  FileOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { useModelStore } from '../../stores/model-store'
import { useChatStore } from '../../stores/chat-store'
import { dialogClient } from '../../services/ipc-client'
import type { LocalModel, DownloadProgress } from '../../types'

const { Text } = Typography

export default function ModelCard() {
  const {
    localModels, loadedModel, isScanning, loadModel, unloadModel,
    deleteModel, downloadProgress, scanModels
  } = useModelStore()
  const { checkModelStatus } = useChatStore()

  const [modelInfo, setModelInfo] = useState<any>(null)
  const [infoVisible, setInfoVisible] = useState(false)

  const handleLoad = async (model: LocalModel) => {
    const success = await loadModel(model)
    if (success) {
      await checkModelStatus()
    }
  }

  const handleUnload = async () => {
    await unloadModel()
    await checkModelStatus()
  }

  const handleDelete = async (model: LocalModel) => {
    await deleteModel(model.id)
  }

  const handleAddLocal = async () => {
    const filePath = await dialogClient.openFile({
      filters: [
        { name: 'GGUF 模型文件', extensions: ['gguf'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    // 这个需要复制到模型目录，简化为提示
    if (filePath) {
      Modal.info({
        title: '添加模型',
        content: `请手动将模型文件复制到模型目录中，然后刷新列表。\n\n文件路径: ${filePath}`,
        okText: '知道了'
      })
    }
  }

  const formatSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  // 查找下载中的模型
  const downloadEntries = Array.from(downloadProgress?.entries?.() || [])

  if (localModels.length === 0 && downloadEntries.length === 0) {
    return (
      <Empty
        description={
          <div>
            <div style={{ marginBottom: 8 }}>暂无本地模型</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              在"模型下载"标签页中从 HuggingFace 下载 GGUF 模型，<br />
              或手动将 .gguf 文件放入模型目录
            </Text>
          </div>
        }
        style={{ padding: 48 }}
      >
        <Space>
          <Button type="primary" onClick={handleAddLocal}>
            添加本地模型
          </Button>
          <Button icon={<FolderOpenOutlined />}>
            打开模型文件夹
          </Button>
        </Space>
      </Empty>
    )
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* 下载中的模型 */}
        {downloadEntries.map(([id, progress]) => (
          <Col xs={24} sm={12} lg={8} key={`download_${id}`}>
            <Card
              size="small"
              title={
                <span style={{ fontSize: 13 }}>
                  <FileOutlined style={{ marginRight: 8 }} />
                  {progress.fileName || '下载中...'}
                </span>
              }
              extra={
                <Tag color="processing">下载中</Tag>
              }
            >
              <Progress
                percent={progress.percentage}
                size="small"
                status={progress.status === 'error' ? 'exception' : 'active'}
                format={(p) => `${p}%`}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                {formatSize(progress.downloaded)} / {formatSize(progress.total)}
                {progress.speed > 0 && ` · ${formatSize(progress.speed)}/s`}
              </div>
            </Card>
          </Col>
        ))}

        {/* 本地模型 */}
        {localModels.map(model => {
          const isLoaded = loadedModel?.id === model.id

          return (
            <Col xs={24} sm={12} lg={8} key={model.id}>
              <Card
                size="small"
                hoverable
                style={{
                  borderColor: isLoaded ? '#1677ff' : undefined,
                  borderWidth: isLoaded ? 2 : 1
                }}
                title={
                  <Tooltip title={model.fileName}>
                    <span style={{ fontSize: 13 }}>
                      <FileOutlined style={{ marginRight: 8 }} />
                      {model.name}
                    </span>
                  </Tooltip>
                }
                extra={
                  isLoaded ? (
                    <Tag color="success">已加载</Tag>
                  ) : undefined
                }
              >
                {/* 标签 */}
                <div style={{ marginBottom: 12 }}>
                  {model.parameters && (
                    <Tag color="blue" style={{ marginBottom: 4 }}>{model.parameters}</Tag>
                  )}
                  {model.quantization && (
                    <Tag color="purple" style={{ marginBottom: 4 }}>{model.quantization}</Tag>
                  )}
                  <Tag style={{ marginBottom: 4 }}>{formatSize(model.fileSize)}</Tag>
                </div>

                {/* 操作按钮 */}
                <Space>
                  {isLoaded ? (
                    <Button
                      size="small"
                      icon={<PauseCircleOutlined />}
                      onClick={handleUnload}
                    >
                      卸载
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleLoad(model)}
                    >
                      加载
                    </Button>
                  )}

                  <Popconfirm
                    title="确定删除此模型？"
                    onConfirm={() => handleDelete(model)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
