/**
 * 智语 Studio — 聊天输入框
 * 支持 Shift+Enter 换行，Enter 发送
 */
import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react'
import { Input, Button, Space, Tooltip, Image } from 'antd'
import { SendOutlined, PauseCircleOutlined, ClearOutlined, PictureOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ChatAttachment } from '../../types'

const { TextArea } = Input

interface Props {
  onSend: (content: string, attachments?: ChatAttachment[]) => void
  onStop: () => void
  isStreaming: boolean
  disabled: boolean
}

export default function ChatInput({ onSend, onStop, isStreaming, disabled }: Props) {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const inputRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const trimmed = value.trim()
    if ((!trimmed && attachments.length === 0) || isStreaming) return

    onSend(trimmed, attachments)
    setValue('')
    setAttachments([])

    // 重新聚焦
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter 换行
    if (e.key === 'Enter' && e.shiftKey) {
      return
    }
    // Enter 发送
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    setValue('')
    setAttachments([])
    inputRef.current?.focus()
  }

  const handlePickImages = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    const loaded = await Promise.all(imageFiles.map(file => new Promise<ChatAttachment>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'image',
        name: file.name,
        mimeType: file.type,
        dataUrl: String(reader.result)
      })
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })))

    setAttachments(current => [...current, ...loaded].slice(0, 6))
  }

  const removeAttachment = (id: string) => {
    setAttachments(current => current.filter(item => item.id !== id))
  }

  return (
    <div>
      {attachments.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 8,
          overflowX: 'auto'
        }}>
          {attachments.map(attachment => (
            <div
              key={attachment.id}
              style={{
                position: 'relative',
                width: 76,
                height: 76,
                border: '1px solid #d9d9d9',
                borderRadius: 6,
                overflow: 'hidden',
                flex: '0 0 auto'
              }}
            >
              <Image
                src={attachment.dataUrl}
                alt={attachment.name}
                width={76}
                height={76}
                style={{ objectFit: 'cover' }}
                preview={false}
              />
              <Button
                size="small"
                type="primary"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeAttachment(attachment.id)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 24,
                  height: 24
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <TextArea
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? '请先创建一个对话...' : '输入问题，或附图让视觉模型分析...'}
          autoSize={{ minRows: 1, maxRows: 6 }}
          disabled={disabled}
          style={{ flex: 1, borderRadius: 8 }}
        />

        <Space>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleImageChange}
          />
          <Tooltip title="添加图片">
            <Button
              icon={<PictureOutlined />}
              onClick={handlePickImages}
              disabled={isStreaming || disabled}
            />
          </Tooltip>
          {(value || attachments.length > 0) && (
            <Tooltip title="清空">
              <Button
                icon={<ClearOutlined />}
                onClick={handleClear}
                disabled={isStreaming}
              />
            </Tooltip>
          )}

          {isStreaming ? (
            <Button
              type="primary"
              danger
              icon={<PauseCircleOutlined />}
              onClick={onStop}
            >
              停止
            </Button>
          ) : (
            <Tooltip title="发送 (Enter)">
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={(!value.trim() && attachments.length === 0) || disabled}
              >
                发送
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>
    </div>
  )
}
