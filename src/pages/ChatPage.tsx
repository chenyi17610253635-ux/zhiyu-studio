/**
 * 智语 Studio — 聊天页面
 * 核心功能：多会话管理、流式对话、Markdown 渲染
 */
import { Progress, useEffect } from 'react'
import { useChatStore } from '../stores/chat-store'
import { useModelStore } from '../stores/model-store'
import SessionList from '../components/chat/SessionList'
import ChatWindow from '../components/chat/ChatWindow'
import ChatInput from '../components/chat/ChatInput'
import ModelSelector from '../components/chat/ModelSelector'
import type { ChatAttachment } from '../types'

export default function ChatPage() {
  const { isLoading, loadProgress } = useModelStore()
  const {
    activeSessionId, sessions, loadSessions, createSession,
    sendMessage, isStreaming, stopStreaming
  } = useChatStore()

  useEffect(() => {
    loadSessions()
  }, [])

  // 如果没有会话，自动创建一个
  useEffect(() => {
    if (sessions.length === 0) {
      createSession()
    }
  }, [sessions.length])

  const handleSend = (content: string, attachments?: ChatAttachment[]) => {
    sendMessage(content, attachments)
  }

  return (
    <div style={
      {isLoading && (
        <div className="model-loading-overlay">
          <div className="model-loading-card">
            <h3>正在加载模型</h3>
            <Progress
              percent={loadProgress?.percent || 0}
              status="active"
              strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
            />
            <p className="loading-message">{loadProgress?.message || '准备中...'}</p>
          </div>
        </div>
      )}
{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* 左侧会话列表 */}
      <div style={{
        width: 260,
        minWidth: 260,
        borderRight: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        background: '#fafafa'
      }}>
        {/* 模型选择器 */}
        <div style={{ padding: '12px' }}>
          <ModelSelector />
        </div>

        {/* 会话列表 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SessionList />
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#fff'
      }}>
        {/* 聊天窗口 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatWindow />
        </div>

        {/* 输入框 */}
        <div style={{
          borderTop: '1px solid #f0f0f0',
          padding: '16px',
          background: '#fff'
        }}>
          <ChatInput
            onSend={handleSend}
            onStop={stopStreaming}
            isStreaming={isStreaming}
            disabled={!activeSessionId}
          />
        </div>
      </div>
    </div>
  )
}
