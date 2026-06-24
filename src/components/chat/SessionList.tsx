/**
 * 智语 Studio — 会话列表组件
 */
import { useState } from 'react'
import { Button, Input, List, Popconfirm, Typography, Space, Badge } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { useChatStore } from '../../stores/chat-store'

export default function SessionList() {
  const {
    sessions, activeSessionId, setActiveSession,
    createSession, deleteSession
  } = useChatStore()

  const [searchText, setSearchText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchText.toLowerCase())
  )

  const handleCreate = async () => {
    await createSession('新对话')
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶栏：搜索 + 新建 */}
      <div style={{ padding: '8px 12px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            对话列表 ({sessions.length})
          </Typography.Text>
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新建
          </Button>
        </Space>
        <Input
          size="small"
          placeholder="搜索对话..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ marginTop: 8 }}
          allowClear
        />
      </div>

      {/* 会话列表 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredSessions.length === 0 ? (
          <div style={{
            padding: 32,
            textAlign: 'center',
            color: '#bbb',
            fontSize: 13
          }}>
            {searchText ? '未找到匹配的对话' : '暂无对话记录'}
          </div>
        ) : (
          <List
            dataSource={filteredSessions}
            size="small"
            split={false}
            renderItem={(session) => (
              <div
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  background: session.id === activeSessionId ? '#e6f4ff' : 'transparent',
                  borderLeft: session.id === activeSessionId ? '3px solid #1677ff' : '3px solid transparent',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    session.id === activeSessionId ? '#e6f4ff' : '#f5f5f5'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    session.id === activeSessionId ? '#e6f4ff' : 'transparent'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: session.id === activeSessionId ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    <MessageOutlined style={{ marginRight: 6, fontSize: 12, opacity: 0.5 }} />
                    {session.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                    {formatTime(session.updatedAt)} · {session.messageCount} 条消息
                  </div>
                </div>

                <Popconfirm
                  title="确定删除此对话？"
                  onConfirm={(e) => {
                    e?.stopPropagation()
                    deleteSession(session.id)
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="删除"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    style={{ opacity: 0.5 }}
                  />
                </Popconfirm>
              </div>
            )}
          />
        )}
      </div>
    </div>
  )
}
