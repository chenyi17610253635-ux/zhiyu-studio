/**
 * 智语 Studio — 模型参数配置面板
 */
import { Form, Slider, InputNumber, Input, Button, Space, Card, Divider, Typography, message, Checkbox } from 'antd'
import { FolderOpenOutlined, SaveOutlined, ThunderboltOutlined, UndoOutlined } from '@ant-design/icons'
import { useModelStore } from '../../stores/model-store'

const { Title, Text } = Typography
const { TextArea } = Input

const DEFAULT_CONFIG = {
  contextSize: 32768,
  batchSize: 1024,
  ubatchSize: 512,
  parallel: 1,
  keep: 0,
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048,
  gpuLayers: 99,
  threads: 8,
  seed: -1,
  flashAttention: false,
  mlock: false,
  noMmap: false,
  numa: false,
  mmprojPath: '',
  systemPrompt: '你是一个智能助手。请用中文回答问题，保持回答准确、简洁、有帮助。'
}

export default function ModelConfig() {
  const { modelConfig, updateConfig } = useModelStore()
  const [form] = Form.useForm()

  const handleSave = () => {
    const values = form.getFieldsValue()
    updateConfig(values)
    message.success('模型参数已保存')
  }

  const handleReset = () => {
    form.setFieldsValue(DEFAULT_CONFIG)
    updateConfig(DEFAULT_CONFIG)
    message.info('已恢复默认参数')
  }

  const handlePickMmproj = async () => {
    const filePath = await window.zhiyuAPI.openFileDialog({
      filters: [
        { name: '多模态 projector', extensions: ['gguf', 'bin'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    if (filePath) {
      form.setFieldValue('mmprojPath', filePath)
      updateConfig({ mmprojPath: filePath })
    }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={modelConfig}
        >
          <Title level={5}>推理参数</Title>

          <Form.Item
            name="temperature"
            label="温度 (Temperature)"
            tooltip="值越大回复越随机，越小越确定。推荐范围 0.1-1.0"
          >
            <Slider
              min={0}
              max={2}
              step={0.05}
              marks={{ 0: '0', 0.5: '0.5', 0.7: '0.7', 1: '1', 1.5: '1.5', 2: '2' }}
              tooltip={{ formatter: (v) => v?.toFixed(2) }}
            />
          </Form.Item>

          <Form.Item
            name="topP"
            label="核采样 (Top-P)"
            tooltip="限制词汇选择范围，推荐 0.9"
          >
            <Slider
              min={0}
              max={1}
              step={0.05}
              marks={{ 0: '0', 0.5: '0.5', 0.9: '0.9', 1: '1' }}
            />
          </Form.Item>

          <Form.Item
            name="maxTokens"
            label="最大输出长度"
            tooltip="单次回复的最大 token 数量"
          >
            <InputNumber
              min={1}
              max={32768}
              step={256}
              addonAfter="tokens"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="contextSize"
            label="上下文长度"
            tooltip="模型可处理的上下文窗口大小，值越大占用越多内存"
          >
            <InputNumber
              min={256}
              max={131072}
              step={1024}
              addonAfter="tokens"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="seed"
            label="随机种子"
            tooltip="设为 -1 使用随机种子；固定数字可让回复更可复现"
          >
            <InputNumber
              min={-1}
              max={2147483647}
              step={1}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Divider />

          <Title level={5}>性能配置</Title>
          <Text type="secondary">
            这些参数会直传给 llama-server。显存足够时可提高 GPU 层数、batch，并启用 Flash Attention。
          </Text>

          <Form.Item
            name="gpuLayers"
            label="GPU 加速层数"
            tooltip="设为 -1 表示所有层都在 GPU 上运行，0 表示纯 CPU 模式"
          >
            <InputNumber
              min={-1}
              max={256}
              step={1}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="threads"
            label="CPU 线程数"
            tooltip="推理时使用的 CPU 线程数量，建议设为 CPU 核心数"
          >
            <InputNumber
              min={1}
              max={64}
              step={1}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="batchSize"
            label="批处理大小"
            tooltip="对应 --batch-size。值越大吞吐可能越高，但更吃显存/内存"
          >
            <InputNumber
              min={32}
              max={8192}
              step={128}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="ubatchSize"
            label="物理批处理大小"
            tooltip="对应 --ubatch-size。通常小于或等于批处理大小"
          >
            <InputNumber
              min={32}
              max={8192}
              step={128}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="parallel"
            label="并行请求数"
            tooltip="对应 --parallel。单人聊天建议 1，多用户 API 服务可提高"
          >
            <InputNumber
              min={1}
              max={16}
              step={1}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="keep"
            label="保留 Prompt Token"
            tooltip="对应 --keep。0 表示使用 llama.cpp 默认策略"
          >
            <InputNumber
              min={0}
              max={32768}
              step={128}
              addonAfter="tokens"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Space wrap style={{ marginBottom: 12 }}>
            <Form.Item name="flashAttention" valuePropName="checked" noStyle>
              <Checkbox>Flash Attention</Checkbox>
            </Form.Item>
            <Form.Item name="mlock" valuePropName="checked" noStyle>
              <Checkbox>锁定模型到内存</Checkbox>
            </Form.Item>
            <Form.Item name="noMmap" valuePropName="checked" noStyle>
              <Checkbox>禁用 mmap</Checkbox>
            </Form.Item>
            <Form.Item name="numa" valuePropName="checked" noStyle>
              <Checkbox>NUMA</Checkbox>
            </Form.Item>
          </Space>

          <Divider />

          <Title level={5}>视觉多模态</Title>

          <Form.Item
            name="mmprojPath"
            label="多模态 projector 路径"
            tooltip="视觉模型需要对应的 mmproj GGUF；留空则按纯文本模型加载"
          >
            <Input
              placeholder="选择 mmproj 文件，例如 mmproj-model-f16.gguf"
              addonAfter={
                <Button
                  type="text"
                  size="small"
                  icon={<FolderOpenOutlined />}
                  onClick={handlePickMmproj}
                />
              }
            />
          </Form.Item>

          <Divider />

          <Title level={5}>系统提示词</Title>

          <Form.Item
            name="systemPrompt"
            label="系统提示词"
            tooltip="设定 AI 的角色和行为方式，每次对话开始时生效"
          >
            <TextArea
              rows={4}
              placeholder="输入系统提示词..."
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Divider />

          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
            >
              保存配置
            </Button>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={() => {
                const fastConfig = {
                  ...modelConfig,
                  gpuLayers: -1,
                  batchSize: 2048,
                  ubatchSize: 512,
                  flashAttention: false,
                  parallel: 1
                }
                form.setFieldsValue(fastConfig)
                updateConfig(fastConfig)
                message.success('已应用高性能预设，重新加载模型后生效')
              }}
            >
              高性能预设
            </Button>
            <Button
              icon={<UndoOutlined />}
              onClick={handleReset}
            >
              恢复默认
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  )
}

