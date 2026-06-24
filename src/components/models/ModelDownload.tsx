/**
 * 智语 Studio — 模型下载面板
 * 搜索 HuggingFace 上的 GGUF 模型并下载
 */
import { useState } from 'react'
import { Input, List, Button, Tag, Space, Typography, message, Card, Row, Col, Statistic, Tooltip } from 'antd'
import { SearchOutlined, DownloadOutlined, CloudDownloadOutlined, FireOutlined } from '@ant-design/icons'
import { useModelStore } from '../../stores/model-store'
import type { HFModel } from '../../types'

const { Text, Paragraph } = Typography

// 推荐模型列表
const RECOMMENDED_MODELS: HFModel[] = [
  {
    id: 'Qwen/Qwen2.5-7B-Instruct-GGUF',
    name: 'Qwen2.5-7B-Instruct-GGUF',
    author: 'Qwen',
    downloads: 1250000,
    likes: 3420,
    updatedAt: '2025-06-15',
    tags: ['gguf', 'chinese', 'text-generation', '推荐'],
    description: '通义千问2.5 7B 指令微调版本，中文能力出色的开源模型'
  },
  {
    id: 'lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF',
    name: 'Llama-3.1-8B-Instruct-GGUF',
    author: 'lmstudio-community',
    downloads: 980000,
    likes: 2800,
    updatedAt: '2025-05-20',
    tags: ['gguf', 'llama3', 'text-generation'],
    description: 'Meta Llama 3.1 8B 指令微调版本'
  },
  {
    id: 'MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF',
    name: 'Mistral-7B-Instruct-v0.3-GGUF',
    author: 'MaziyarPanahi',
    downloads: 750000,
    likes: 2100,
    updatedAt: '2025-04-10',
    tags: ['gguf', 'mistral', 'text-generation'],
    description: 'Mistral 7B v0.3 指令微调版'
  },
  {
    id: 'nomic-ai/nomic-embed-text-v1.5-GGUF',
    name: 'nomic-embed-text-v1.5-GGUF',
    author: 'nomic-ai',
    downloads: 320000,
    likes: 950,
    updatedAt: '2025-02-15',
    tags: ['gguf', 'embedding', '推荐'],
    description: '文本向量化模型，用于 RAG 知识库检索'
  }
]

export default function ModelDownload() {
  const { hfModels, isSearching, searchHF, startDownload } = useModelStore()
  const [searchText, setSearchText] = useState('')
  const [showRecommendations, setShowRecommendations] = useState(true)

  const handleSearch = (value: string) => {
    setSearchText(value)
    setShowRecommendations(false)
    searchHF(value)
  }

  const handleDownload = async (model: HFModel) => {
    try {
      message.loading({ content: `开始下载 ${model.name}...`, key: 'download' })
      await startDownload(model.id, `https://huggingface.co/${model.id}`)
      message.success({ content: `${model.name} 下载完成！`, key: 'download' })
    } catch (error) {
      message.error({ content: `下载失败: ${model.name}`, key: 'download' })
    }
  }

  const formatDownloads = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return String(num)
  }

  const displayModels = showRecommendations ? RECOMMENDED_MODELS : hfModels

  return (
    <div>
      {/* 搜索框 */}
      <Input.Search
        placeholder="搜索 HuggingFace 上的 GGUF 模型（如 Qwen2, Llama, Mistral...）"
        enterButton={<><SearchOutlined /> 搜索</>}
        size="large"
        onSearch={handleSearch}
        loading={isSearching}
        style={{ marginBottom: 24 }}
      />

      {/* 推荐标题 */}
      {showRecommendations && (
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 16 }}>
            <FireOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
            推荐模型
          </Text>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
            以下模型已在智语 Studio 上验证兼容
          </Text>
        </div>
      )}

      {/* 搜索结果 */}
      {!showRecommendations && searchText && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            搜索 "{searchText}" 的结果 ({displayModels.length} 个)
          </Text>
        </div>
      )}

      {/* 模型列表 */}
      <Row gutter={[16, 16]}>
        {displayModels.map(model => (
          <Col xs={24} sm={12} lg={8} key={model.id}>
            <Card
              hoverable
              size="small"
              title={
                <Tooltip title={model.id}>
                  <span style={{ fontSize: 14 }}>{model.name}</span>
                </Tooltip>
              }
              extra={
                <Button
                  type="primary"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(model)}
                >
                  下载
                </Button>
              }
            >
              <div style={{ marginBottom: 8 }}>
                {model.tags.map(tag => (
                  <Tag key={tag} style={{ marginBottom: 4 }}>{tag}</Tag>
                ))}
              </div>

              {model.description && (
                <Paragraph
                  ellipsis={{ rows: 2 }}
                  style={{ fontSize: 12, color: '#666', marginBottom: 8 }}
                >
                  {model.description}
                </Paragraph>
              )}

              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="下载量"
                    value={formatDownloads(model.downloads)}
                    prefix={<CloudDownloadOutlined />}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="作者"
                    value={model.author}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>

      {!showRecommendations && displayModels.length === 0 && !isSearching && (
        <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
          未找到匹配的模型，请尝试其他搜索词
        </div>
      )}
    </div>
  )
}
