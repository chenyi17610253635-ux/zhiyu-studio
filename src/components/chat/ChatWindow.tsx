/**
 * 智语 Studio — 聊天窗口
 * 渲染消息列表，支持 Markdown 和流式显示
 */
import { useEffect, useRef } from 'react'
import { Empty, Button, Spin } from 'antd'
import {
  RobotOutlined,
  SmileOutlined
} from '@ant-design/icons'
import { useChatStore } from '../../stores/chat-store'
import MessageBubble from './MessageBubble'

export default function ChatWindow() {
  const {
    activeSessionId, messages, isStreaming, streamingText, streamingSpeed,
    tokenCount, isModelLoaded, regenerateLastMessage
  } = useChatStore()

  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // 空状态
  if (!activeSessionId) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
        <Empty
          image={<SmileOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
          description={
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#333' }}>
                智语 Studio
              </div>
              <div style={{ color: '#999' }}>
                {isModelLoaded
                  ? '选择一个对话或新建对话开始'
                  : '在「模型管理」中加载模型后即可开始对话'}
              </div>
            </div>
          }
        />
      </div>
    )
  }

  // 暂无消息
  if (messages.length === 0 && !isStreaming) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        flexDirection: 'column',
        gap: 16
      }}>
        <RobotOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
        <div style={{ fontSize: 16, color: '#999' }}>
          {isModelLoaded ? '开始一段新对话吧！' : '请先在模型管理中加载一个模型'}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      padding: '16px 24px'
    }}>
      {/* 居中容器，最大宽度 900px */}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* 消息列表 */}
        {messages.map((msg, index) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={index === messages.length - 1}
            onRegenerate={msg.role === 'assistant' && index === messages.length - 1
              ? regenerateLastMessage
              : undefined}
          />
        ))}

        {/* 流式输出中的内容 */}
        {isStreaming && streamingText && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingText,
              timestamp: new Date().toISOString(),
              isStreaming: true
            }}
            isLast={true}
          />
        )}

        {/* 加载指示器 */}
        {isStreaming && !streamingText && (
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#999'
          }}>
            <Spin size="small" />
            <span>思考中...</span>
          </div>
        )}

        {/* 生成速度指示 */}
        {isStreaming && streamingText && (
          <div style={{
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#1677ff',
            fontSize: 12,
            fontWeight: 500
          }}>
            <Spin size="small" />
            <span>生成中</span>
            {streamingSpeed > 0 && (
              <span>· {streamingSpeed} tok/s</span>
            )}
            <span>· {tokenCount} tokens</span>
            <span>· {streamingText.length} 字</span>
          </div>
        )}

        {/* 滚动锚点 */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
