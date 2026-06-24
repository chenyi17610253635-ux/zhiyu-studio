/**
 * 智语 Studio — 知识库检索测试组件
 */
import { useState } from 'react'
import { Input, Button, Card, List, Typography, Empty, Space, Tag, Spin } from 'antd'
import { SearchOutlined, FileTextOutlined } from '@ant-design/icons'
import { useRagStore } from '../../stores/rag-store'

const { Text, Paragraph } = Typography

export default function KnowledgeBase() {
  const { search, documents, isSearching } = useRagStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])

  const handleSearch = async () => {
    if (!query.trim()) return
    const searchResults = await search(query.trim())
    setResults(searchResults)
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <Card style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          输入问题，测试知识库检索效果。系统将从已上传的文档中查找相关内容。
        </Text>

        <Input.Search
          placeholder="输入检索内容..."
          enterButton={<><SearchOutlined /> 搜索</>}
          size="large"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onSearch={handleSearch}
          loading={isSearching}
        />
      </Card>

      {/* 搜索结果 */}
      {results.length > 0 && (
        <div>
          <Text type="secondary" style={{ marginBottom: 12, display: 'block' }}>
            找到 {results.length} 个相关内容
          </Text>

          {results.map((result, index) => {
            const doc = documents.find(d => d.id === result.docId)
            return (
              <Card
                key={index}
                size="small"
                style={{ marginBottom: 8 }}
                title={
                  <Space>
                    <FileTextOutlined />
                    <Text strong style={{ fontSize: 13 }}>
                      {doc?.fileName || '未知文档'}
                    </Text>
                    <Tag>相关度: {Math.round((result.score || 0) * 100)}%</Tag>
                  </Space>
                }
              >
                <Paragraph
                  ellipsis={{ rows: 4, expandable: true, symbol: '展开更多' }}
                  style={{ fontSize: 13, lineHeight: 1.8 }}
                >
                  {result.content}
                </Paragraph>
              </Card>
            )
          })}
        </div>
      )}

      {results.length === 0 && query && !isSearching && (
        <Empty description="未找到相关文档内容" style={{ padding: 32 }} />
      )}
    </div>
  )
}
