/**
 * 智语 Studio — 消息气泡组件
 * 支持 Markdown 渲染、代码高亮和数学公式
 */
import React, { useState } from 'react'
import { Avatar, Button, Tooltip, message as antMessage, Image } from 'antd'
import {
  UserOutlined,
  RobotOutlined,
  CopyOutlined,
  RedoOutlined,
  CheckOutlined
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { ChatMessage } from '../../types'

interface Props {
  message: ChatMessage
  isLast: boolean
  onRegenerate?: () => void
}

export default React.memo(function MessageBubble({ message, isLast, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isStreaming = (message as any).isStreaming

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      antMessage.success('已复制')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      antMessage.error('复制失败')
    }
  }

  return (
    <div
      className="message-enter"
      style={{
        display: 'flex',
        gap: 12,
        padding: '8px 0',
        flexDirection: isUser ? 'row-reverse' : 'row'
      }}
    >
      {/* 头像 */}
      <Avatar
        size={36}
        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
        style={{
          backgroundColor: isUser ? '#1677ff' : '#52c41a',
          flexShrink: 0
        }}
      />

      {/* 消息内容 */}
      <div style={{
        maxWidth: '80%',
        minWidth: 100
      }}>
        {/* 角色标签 */}
        <div style={{
          fontSize: 11,
          color: '#999',
          marginBottom: 4,
          textAlign: isUser ? 'right' : 'left',
          padding: '0 4px'
        }}>
          {isUser ? '你' : 'AI 助手'}
          <span style={{ marginLeft: 8 }}>
            {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit'
            })}
            {!isUser && !isStreaming && message.generationSpeed ? (
              <span style={{ marginLeft: 8, color: '#1677ff', fontSize: 11 }}>
                {'\u26A1'} {message.generationSpeed} tok/s
                {message.tokenCount ? ` \u00B7 ${message.tokenCount} tokens` : ''}
              </span>
            ) : null}
          </span>
        </div>

        {/* 消息气泡 */}
        <div style={{
          padding: '10px 16px',
          borderRadius: 12,
          background: isUser ? '#e6f4ff' : '#f5f5f5',
          borderTopLeftRadius: isUser ? 12 : 2,
          borderTopRightRadius: isUser ? 2 : 12,
          lineHeight: 1.7
        }}>
          {message.attachments && message.attachments.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 8,
              marginBottom: message.content ? 8 : 0,
              maxWidth: 420
            }}>
              {message.attachments.map(attachment => (
                <Image
                  key={attachment.id}
                  src={attachment.dataUrl}
                  alt={attachment.name}
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid #d9d9d9'
                  }}
                />
              ))}
            </div>
          )}

          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.content}
            </div>
          ) : (
            <div className={`markdown-body ${isStreaming ? 'streaming-cursor' : ''}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const codeContent = String(children).replace(/\n$/, '')

                    // 代码块（有语言标识）
                    if (match && codeContent.includes('\n')) {
                      return (
                        <div style={{ position: 'relative' }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 16px',
                            background: '#2d2d2d',
                            borderTopLeftRadius: 8,
                            borderTopRightRadius: 8,
                            fontSize: 12,
                            color: '#999'
                          }}>
                            <span>{match[1]}</span>
                            <Button
                              type="text"
                              size="small"
                              style={{ color: '#999' }}
                              onClick={() => {
                                navigator.clipboard.writeText(codeContent)
                                antMessage.success('代码已复制')
                              }}
                            >
                              复制代码
                            </Button>
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderTopLeftRadius: 0,
                              borderTopRightRadius: 0,
                              borderBottomLeftRadius: 8,
                              borderBottomRightRadius: 8
                            }}
                          >
                            {codeContent}
                          </SyntaxHighlighter>
                        </div>
                      )
                    }

                    // 行内代码
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* 操作按钮（AI 消息） */}
        {!isUser && !isStreaming && (
          <div style={{ marginTop: 4, display: 'flex', gap: 4, paddingLeft: 4 }}>
            <Tooltip title="复制">
              <Button
                type="text"
                size="small"
                icon={copied ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                onClick={handleCopy}
              />
            </Tooltip>
            {isLast && onRegenerate && (
              <Tooltip title="重新生成">
                <Button
                  type="text"
                  size="small"
                  icon={<RedoOutlined />}
                  onClick={onRegenerate}
                />
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
