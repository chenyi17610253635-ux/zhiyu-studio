/**
 * 智语 Studio — 文档上传组件
 * 支持拖拽和点击上传 PDF/DOCX/TXT/Markdown
 */
import { useState } from 'react'
import { Upload, Button, Card, message, Space, Typography, Alert } from 'antd'
import { InboxOutlined, FileTextOutlined } from '@ant-design/icons'
import { useRagStore } from '../../stores/rag-store'
import { dialogClient } from '../../services/ipc-client'
import type { UploadProps } from 'antd'

const { Dragger } = Upload
const { Text, Title } = Typography

export default function DocUploader() {
  const { uploadDocument, isUploading } = useRagStore()
  const [lastUpload, setLastUpload] = useState<{ name: string; chunks: number } | null>(null)

  const handleUpload = async (filePath: string) => {
    try {
      const doc = await uploadDocument(filePath, '默认知识库')
      setLastUpload({ name: doc.fileName, chunks: doc.chunkCount })
      message.success(`文档 "${doc.fileName}" 解析完成，共 ${doc.chunkCount} 个文本块`)
    } catch (error: any) {
      message.error(`上传失败: ${error.message || '未知错误'}`)
    }
  }

  const handleFileSelect = async () => {
    const filePath = await dialogClient.openFile({
      filters: [
        { name: '支持的文件', extensions: ['pdf', 'docx', 'txt', 'md', 'markdown'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })

    if (filePath) {
      handleUpload(filePath)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <Card>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          上传文档后，AI 可以基于文档内容进行检索增强问答。支持 PDF、DOCX、TXT、Markdown 格式。
        </Text>

        {/* 拖拽上传区域 */}
        <div
          style={{
            border: '2px dashed #d9d9d9',
            borderRadius: 12,
            padding: '48px',
            textAlign: 'center',
            background: '#fafafa',
            cursor: 'pointer',
            marginBottom: 24,
            transition: 'all 0.3s'
          }}
          onClick={handleFileSelect}
          onDragOver={(e) => {
            e.preventDefault()
            e.currentTarget.style.borderColor = '#1677ff'
            e.currentTarget.style.background = '#e6f4ff'
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = '#d9d9d9'
            e.currentTarget.style.background = '#fafafa'
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.currentTarget.style.borderColor = '#d9d9d9'
            e.currentTarget.style.background = '#fafafa'

            const files = Array.from(e.dataTransfer.files)
            const supportedExtensions = ['.pdf', '.docx', '.txt', '.md', '.markdown']
            const supportedFile = files.find(f =>
              supportedExtensions.some(ext => f.name.toLowerCase().endsWith(ext))
            )

            if (supportedFile) {
              // Electron 环境中可以通过路径访问
              if ((supportedFile as any).path) {
                handleUpload((supportedFile as any).path)
              }
            } else {
              message.warning('不支持的格式，请上传 PDF、DOCX、TXT 或 Markdown 文件')
            }
          }}
        >
          <InboxOutlined style={{ fontSize: 48, color: '#1677ff' }} />
          <div style={{ marginTop: 16, fontSize: 16, color: '#333' }}>
            点击或拖拽文件到此处上传
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: '#999' }}>
            支持 PDF · DOCX · TXT · Markdown
          </div>
        </div>

        {/* 手动选择按钮 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Button
            type="primary"
            size="large"
            icon={<FileTextOutlined />}
            onClick={handleFileSelect}
            loading={isUploading}
          >
            选择文件上传
          </Button>
        </div>

        {/* 最近上传 */}
        {lastUpload && (
          <Alert
            type="success"
            showIcon
            message="文档解析完成"
            description={
              <span>
                <strong>{lastUpload.name}</strong> 已成功解析，共 {lastUpload.chunks} 个文本块。
                现在可以在聊天中切换到 RAG 模式，基于此文档进行问答。
              </span>
            }
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    </div>
  )
}
