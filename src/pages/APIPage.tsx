/**
 * 智语 Studio — API 服务页面
 * 显示 API 服务状态和使用示例
 */
import { useEffect, useState } from 'react'
import {
  Card, Button, Tag, Typography, Space, Divider,
  Alert, Row, Col, Statistic, Tabs, message
} from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ApiOutlined,
  CopyOutlined,
  CheckCircleFilled,
  CloseCircleFilled
} from '@ant-design/icons'
import { serverClient } from '../services/ipc-client'
import { useChatStore } from '../stores/chat-store'
import type { ServerStatus } from '../types'

const { Title, Text, Paragraph } = Typography

export default function APIPage() {
  const [status, setStatus] = useState<ServerStatus>({ isRunning: false, port: 1234, address: '' })
  const isModelLoaded = useChatStore(s => s.isModelLoaded)

  useEffect(() => {
    loadStatus()
    const interval = setInterval(loadStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadStatus = async () => {
    try {
      const s = await serverClient.getStatus()
      setStatus(s)
    } catch { /* ignore */ }
  }

  const handleToggle = async () => {
    try {
      await serverClient.toggle(!status.isRunning)
      await loadStatus()
      message.success(status.isRunning ? 'API 服务已停止' : 'API 服务已启动')
    } catch {
      message.error('操作失败')
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  }

  const address = `http://127.0.0.1:${status.port}`

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
        <Title level={4} style={{ margin: 0 }}>API 服务</Title>
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {/* 服务状态卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="服务状态"
                value={status.isRunning ? '运行中' : '已停止'}
                valueStyle={{ color: status.isRunning ? '#52c41a' : '#ff4d4f', fontSize: 20 }}
                prefix={status.isRunning ? <CheckCircleFilled /> : <CloseCircleFilled />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="端口" value={status.port} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="接口地址" value={address} valueStyle={{ fontSize: 14 }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="模型状态"
                value={isModelLoaded ? '已加载' : '未加载'}
                valueStyle={{ color: isModelLoaded ? '#52c41a' : '#ff4d4f', fontSize: 18 }}
              />
            </Card>
          </Col>
        </Row>

        {/* 控制按钮 */}
        <Card style={{ marginBottom: 24 }}>
          <Space>
            <Button
              type={status.isRunning ? 'default' : 'primary'}
              danger={status.isRunning}
              icon={status.isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={handleToggle}
              size="large"
            >
              {status.isRunning ? '停止服务' : '启动服务'}
            </Button>

            <Tag icon={<ApiOutlined />} color={status.isRunning ? 'success' : 'default'}>
              完全兼容 OpenAI API 格式
            </Tag>
          </Space>

          {!isModelLoaded && status.isRunning && (
            <Alert
              type="warning"
              showIcon
              message="当前未加载模型，API 请求将无法正常响应"
              style={{ marginTop: 12 }}
            />
          )}
        </Card>

        {/* 使用示例 */}
        <Card
          title="使用示例"
          extra={
            <Tag color="blue">OpenAI 兼容</Tag>
          }
        >
          <Tabs
            items={[
              {
                key: 'curl',
                label: 'cURL',
                children: (
                  <div style={{ position: 'relative' }}>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      style={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={() => handleCopy(
                        `curl ${address}/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"local-model","messages":[{"role":"user","content":"你好！"}],"stream":true}'`
                      )}
                    >
                      复制
                    </Button>
                    <pre style={{
                      background: '#1e1e1e',
                      color: '#d4d4d4',
                      padding: 16,
                      borderRadius: 8,
                      fontSize: 13,
                      overflow: 'auto'
                    }}>
{`curl ${address}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "local-model",
    "messages": [{"role": "user", "content": "你好！"}],
    "stream": true
  }'`}
                    </pre>
                  </div>
                )
              },
              {
                key: 'python',
                label: 'Python',
                children: (
                  <div style={{ position: 'relative' }}>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      style={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={() => handleCopy(
                        `from openai import OpenAI\n\nclient = OpenAI(base_url="${address}/v1", api_key="not-needed")\nresponse = client.chat.completions.create(model="local-model", messages=[{"role":"user","content":"你好！"}], stream=True)\nfor chunk in response:\n    print(chunk.choices[0].delta.content, end="")`
                      )}
                    >
                      复制
                    </Button>
                    <pre style={{
                      background: '#1e1e1e',
                      color: '#d4d4d4',
                      padding: 16,
                      borderRadius: 8,
                      fontSize: 13,
                      overflow: 'auto'
                    }}>
{`from openai import OpenAI

client = OpenAI(
    base_url="${address}/v1",
    api_key="not-needed"  # 本地服务不需要 API Key
)

# 流式对话
response = client.chat.completions.create(
    model="local-model",
    messages=[{"role": "user", "content": "你好！"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")`}
                    </pre>
                  </div>
                )
              },
              {
                key: 'js',
                label: 'JavaScript',
                children: (
                  <div style={{ position: 'relative' }}>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      style={{ position: 'absolute', top: 8, right: 8 }}
                      onClick={() => handleCopy(
                        `const response = await fetch('${address}/v1/chat/completions', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'local-model',messages:[{role:'user',content:'你好！'}],stream:true})})`
                      )}
                    >
                      复制
                    </Button>
                    <pre style={{
                      background: '#1e1e1e',
                      color: '#d4d4d4',
                      padding: 16,
                      borderRadius: 8,
                      fontSize: 13,
                      overflow: 'auto'
                    }}>
{`// 使用原生 fetch API
const response = await fetch('${address}/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'local-model',
    messages: [{ role: 'user', content: '你好！' }],
    stream: true
  })
})

// 读取流式响应
const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const text = decoder.decode(value)
  const lines = text.split('\\n')

  for (const line of lines) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      const json = JSON.parse(line.slice(6))
      const content = json.choices?.[0]?.delta?.content
      if (content) process.stdout.write(content)
    }
  }
}`}
                    </pre>
                  </div>
                )
              }
            ]}
          />
        </Card>

        {/* 端点列表 */}
        <Card title="接口端点" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { method: 'POST', path: '/v1/chat/completions', desc: '聊天补全（支持流式）' },
              { method: 'GET', path: '/v1/models', desc: '获取模型列表' },
              { method: 'POST', path: '/v1/embeddings', desc: '文本向量化' },
              { method: 'GET', path: '/health', desc: '健康检查' }
            ].map(endpoint => (
              <div key={endpoint.path} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                background: '#fafafa',
                borderRadius: 6
              }}>
                <Tag color="blue" style={{ minWidth: 50, textAlign: 'center' }}>
                  {endpoint.method}
                </Tag>
                <Text code style={{ fontSize: 14 }}>{endpoint.path}</Text>
                <Text type="secondary">{endpoint.desc}</Text>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
