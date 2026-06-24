/**
 * 智语 Studio — 文档列表组件
 */
import { List, Card, Button, Tag, Space, Empty, Popconfirm, Typography, Statistic, Row, Col } from 'antd'
import {
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FileMarkdownOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { useRagStore } from '../../stores/rag-store'
import type { RagDocument } from '../../types'

const { Text } = Typography

export default function DocList() {
  const { documents, stats, deleteDocument, uploadDocument } = useRagStore()

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />
      case 'docx': return <FileWordOutlined style={{ color: '#1677ff', fontSize: 24 }} />
      case 'md':
      case 'markdown': return <FileMarkdownOutlined style={{ color: '#52c41a', fontSize: 24 }} />
      default: return <FileTextOutlined style={{ color: '#999', fontSize: 24 }} />
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 统计信息
  if (stats) {
    // stats is available
  }

  if (documents.length === 0) {
    return (
      <Empty
        description={
          <div>
            <div style={{ marginBottom: 8 }}>暂无文档</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              上传文档后，AI 可以基于文档内容回答问题
            </Text>
          </div>
        }
        style={{ padding: 48 }}
      />
    )
  }

  return (
    <div>
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Card size="small">
              <Statistic title="文档总数" value={stats.totalDocs} suffix="份" />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="文本块总数" value={stats.totalChunks} suffix="个" />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic title="总大小" value={formatSize(stats.totalSize)} />
            </Card>
          </Col>
        </Row>
      )}

      {/* 文档列表 */}
      <List
        dataSource={documents}
        renderItem={doc => (
          <Card
            size="small"
            hoverable
            style={{ marginBottom: 8 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* 图标 */}
              {getFileIcon(doc.fileType)}

              {/* 信息 */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  {doc.fileName}
                </div>
                <Space size="small">
                  <Tag>{doc.fileType.toUpperCase()}</Tag>
                  <Tag>{doc.chunkCount} 个文本块</Tag>
                  <Tag>{formatSize(doc.fileSize)}</Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    上传于 {formatDate(doc.uploadedAt)}
                  </Text>
                </Space>
              </div>

              {/* 操作 */}
              <Space>
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                >
                  预览
                </Button>
                <Popconfirm
                  title="确定删除此文档及其所有索引？"
                  onConfirm={() => deleteDocument(doc.id)}
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
            </div>
          </Card>
        )}
      />
    </div>
  )
}
