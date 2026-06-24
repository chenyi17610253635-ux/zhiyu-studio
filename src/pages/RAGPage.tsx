/**
 * 智语 Studio — RAG 知识库页面
 * 文档管理、知识库统计、RAG 增强对话
 */
import { useEffect } from 'react'
import { Tabs, Typography } from 'antd'
import { useRagStore } from '../stores/rag-store'
import DocUploader from '../components/rag/DocUploader'
import DocList from '../components/rag/DocList'
import KnowledgeBase from '../components/rag/KnowledgeBase'

const { Title } = Typography

export default function RAGPage() {
  const { documents, stats, loadDocuments, loadStats } = useRagStore()

  useEffect(() => {
    loadDocuments()
    loadStats()
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
        <Title level={4} style={{ margin: 0 }}>知识库</Title>
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        <Tabs
          defaultActiveKey="docs"
          items={[
            {
              key: 'docs',
              label: `我的文档 (${documents.length})`,
              children: <DocList />
            },
            {
              key: 'upload',
              label: '上传文档',
              children: <DocUploader />
            },
            {
              key: 'search',
              label: '检索测试',
              children: <KnowledgeBase />
            }
          ]}
        />
      </div>
    </div>
  )
}
