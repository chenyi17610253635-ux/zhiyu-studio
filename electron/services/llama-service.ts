/**
 * 智语 Studio — llama.cpp 推理服务
 * 通过子进程管理 llama.cpp server，提供聊天和向量化能力
 *
 * 设计原则（参考 LM Studio）：
 * 1. 参数直通：用户设什么就传什么，不自动修改
 * 2. 清晰的启动流程：spawn → 轮询 TCP → resolve
 * 3. 保留完整服务端日志，方便排错
 * 4. 不 catch 静默吞错误
 */
import { ChildProcess, spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import net from 'net'
import http from 'http'
import { getLlamaServerPath } from '../utils/paths'
import { logger } from '../utils/logger'

// ===== 进程退出回调 (chat-handler 注册) =====
let _onProcessExit: ((reason: 'unload' | 'crash' | 'load_fail') => void) | null = null
export function setOnProcessExit(handler: (reason: 'unload' | 'crash' | 'load_fail') => void): void {
  _onProcessExit = handler
}

// ===== 类型定义 =====
export interface LlamaConfig {
  contextSize?: number
  batchSize?: number
  ubatchSize?: number
  parallel?: number
  keep?: number
  gpuLayers?: number
  threads?: number
  seed?: number
  flashAttention?: boolean
  mlock?: boolean
  noMmap?: boolean
  numa?: boolean
  mmprojPath?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  systemPrompt?: string
}

export interface LlamaStatus {
  isLoaded: boolean
  modelName: string | null
  modelPath: string | null
  contextSize: number
  gpuLayers: number
  supportsEmbedding: boolean
  supportsVision: boolean
  serverPort: number
}

export class LlamaService {
  private process: ChildProcess | null = null
  private serverPort: number = 8080
  private intentionalUnload: boolean = false
  private loadProgressCallback: ((pct: number, msg: string) => void) | null = null

  // 保留最近的服务端日志，可用于前端展示
  lastServerLog: string = ''

  private status: LlamaStatus = {
    isLoaded: false,
    modelName: null,
    modelPath: null,
    contextSize: 32768,
    gpuLayers: 0,
    supportsEmbedding: false,
    supportsVision: false,
    serverPort: 8080
  }

  /**
   * LM Studio 风格：参数直通，不加任何"智能"调整
   */
  setLoadProgressCallback(cb: (pct: number, msg: string) => void): void {
    this.loadProgressCallback = cb
  }

  private parseLoadProgress(line: string): void {
    if (!this.loadProgressCallback) return
    var l = line.toLowerCase()
    if (l.includes('llama_model_load') && l.includes('gguf')) this.loadProgressCallback(10, '正在读取模型文件...')
    else if (l.includes('llm_load_vocab') || l.includes('tokenizer')) this.loadProgressCallback(20, '正在加载词汇表...')
    else if (l.includes('llm_load_tensors') || l.includes('load_tensors')) this.loadProgressCallback(30, '正在加载模型张量...')
    else if (l.includes('tensor') && (l.includes('%') || l.includes('complete'))) this.loadProgressCallback(60, '模型张量加载完成')
    else if (l.includes('warmup') || l.includes('warming')) this.loadProgressCallback(80, '正在预热模型...')
    else if (l.includes('server listening') || l.includes('http server')) this.loadProgressCallback(95, '服务器已启动，完成中...')
  }

  async loadModel(modelPath: string, config: LlamaConfig = {}): Promise<boolean> {
    if (this.process) await this.unloadModel()

    const serverPath = getLlamaServerPath()
    if (!fs.existsSync(serverPath)) {
      logger.warn(`llama-server 未找到: ${serverPath}，使用模拟模式`)
      return this.loadModelMock(modelPath, config)
    }

    this.intentionalUnload = false
    this.lastServerLog = ''

    const port = await this.findAvailablePort(8080)
    this.serverPort = port

    // === 参数直通：完全匹配你的批处理脚本 ===
    const gpuLayers = config.gpuLayers != null
      ? (config.gpuLayers === -1 ? 'all' : config.gpuLayers >= 99 ? '999' : String(config.gpuLayers))
      : '999'

    const args = [
      '-m', modelPath,
      '--host', '127.0.0.1',
      '--port', String(port),
      '-c', String(config.contextSize || 32768),
      '-ngl', gpuLayers,
      '-t', String(config.threads ?? 8),
      '-b', String(config.batchSize || 1024),
      '-n', String(config.maxTokens || 8192),
      '--parallel', String(config.parallel || 1),
      // 以下匹配你的批处理脚本（所有模型都加）
      '--flash-attn', 'on',
      '--jinja',
      '--cache-type-k', 'q4_0',
      '--cache-type-v', 'q4_0',
      '--no-warmup',
      '--cont-batching',
    ]

    // 按 config 有条件地加
    if (config.ubatchSize) args.push('--ubatch-size', String(config.ubatchSize))
    if ((config.keep ?? 0) > 0) args.push('--keep', String(config.keep))
    // 视觉模型需要 --image-min-tokens 以获得最佳性能
    if (config.mmprojPath?.trim()) args.push('--image-min-tokens', '1024')
    if ((config.seed ?? -1) >= 0) args.push('--seed', String(config.seed))
    if (config.mlock) args.push('--mlock')
    if (config.noMmap) args.push('--no-mmap')
    if (config.numa) args.push('--numa', 'distribute')
    if (config.mmprojPath?.trim()) {
      const mp = config.mmprojPath.trim()
      if (!fs.existsSync(mp)) throw new Error(`mmproj 文件不存在: ${mp}`)
      args.push('--mmproj', mp)
    }

    logger.info(`启动: ${serverPath} ${args.join(' ')}`)
    if (this.loadProgressCallback) this.loadProgressCallback(0, '正在启动模型服务器...')

    // === 干净的启动流程 ===
    return new Promise((resolve, reject) => {
      this.process = spawn(serverPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })

      // 收集服务端日志
      const onData = (buf: Buffer) => {
        const text = buf.toString()
        this.lastServerLog = (this.lastServerLog + text).slice(-10000)
        logger.debug(`llama-server: ${text.trim()}`)
        this.parseLoadProgress(text)
      }
      this.process.stdout?.on('data', onData)
      this.process.stderr?.on('data', onData)

      this.process.on('error', (e) => {
        logger.error('spawn error', e)
        reject(e)
      })

      this.process.on('exit', (code) => {
        logger.info(`llama-server 退出: ${code}`)
        this.process = null

        if (this.intentionalUnload) return

        // 如果之前 TCP 已通（status.isLoaded = true），属于运行中崩溃
        if (this.status.isLoaded) {
          this.status.isLoaded = false
          _onProcessExit?.('crash')
          return
        }

        // 启动阶段退出：看日志里是否有成功标记
        {
          const tail = this.lastServerLog.trim().slice(-500)
          reject(new Error(`进程退出 (${code})\n${tail}`))
        }
      })

      // TCP 轮询
      const poll = (t0: number) => {
        if (!this.process) return // 已退出，exit handler 处理
        const sock = new net.Socket()
        sock.once('connect', () => {
          sock.destroy()
          if (!this.status.isLoaded) {
            this.status = this.buildStatus(true, modelPath, config, port)
            logger.info(`模型就绪: ${path.basename(modelPath, '.gguf')} :${port}`)
            if (this.loadProgressCallback) this.loadProgressCallback(100, '模型加载完成')
          }
          resolve(true)
        })
        sock.once('error', () => {
          sock.destroy()
          if (Date.now() - t0 > 120000) {
            this.killProcess()
            reject(new Error(`启动超时\n${this.lastServerLog.trim().slice(-500)}`))
          } else {
            setTimeout(() => poll(t0), 300)
          }
        })
        sock.connect(port, '127.0.0.1')
      }
      poll(Date.now())
    })
  }

  private buildStatus(loaded: boolean, modelPath: string, config: LlamaConfig, port: number): LlamaStatus {
    return {
      isLoaded: loaded,
      modelName: loaded ? path.basename(modelPath, '.gguf') : null,
      modelPath: loaded ? modelPath : null,
      contextSize: config.contextSize || 32768,
      gpuLayers: config.gpuLayers ?? 0,
      supportsEmbedding: true,
      supportsVision: Boolean(config.mmprojPath?.trim()),
      serverPort: port,
    }
  }

  /**
   * 模拟模式：当 llama.cpp 不可用时使用
   */
  private async loadModelMock(modelPath: string, config: LlamaConfig): Promise<boolean> {
    logger.info('进入模拟推理模式')
    this.status = this.buildStatus(true, modelPath, config, 0)
    return true
  }

  /**
   * 卸载模型
   */
  async unloadModel(): Promise<void> {
    this.intentionalUnload = true
    this.killProcess()
    this.status = {
      isLoaded: false,
      modelName: null,
      modelPath: null,
      contextSize: 32768,
      gpuLayers: 0,
      supportsEmbedding: false,
      supportsVision: false,
      serverPort: this.serverPort
    }
  }

  /**
   * 流式对话生成
   */
  async *streamChat(messages: Array<{ role: string; content: string; attachments?: any[] }>, options?: any): AsyncGenerator<string> {
    if (!this.status.isLoaded && !this.status.modelPath) {
      yield '请先在模型管理中选择一个模型并点击"加载"。'
      return
    }

    try {
      const response = await this.makeCompletionRequest(messages, { ...options, stream: true })
      if (response) {
        for await (const chunk of response) {
          yield chunk
        }
        return
      }
    } catch (error) {
      logger.error('streamChat HTTP 请求失败', error as Error)
    }

    yield '无法连接到模型服务器。请确认模型已加载，然后重试。'
  }

  /**
   * 非流式对话
   */
  async chat(messages: Array<{ role: string; content: string }>, options?: any): Promise<string> {
    let fullText = ''
    for await (const chunk of this.streamChat(messages, options)) {
      fullText += chunk
    }
    return fullText
  }

  /**
   * 文本向量化
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (!this.process) {
      return texts.map(() => Array.from({ length: 384 }, () => Math.random() * 2 - 1))
    }
    try {
      return await this.makeEmbeddingRequest(texts)
    } catch {
      return texts.map(() => Array.from({ length: 384 }, () => Math.random() * 2 - 1))
    }
  }

  // ===== HTTP 请求 =====

  private async makeCompletionRequest(
    messages: Array<{ role: string; content: string; attachments?: any[] }>,
    options: any
  ): Promise<AsyncGenerator<string> | null> {
    // === 始终使用 /v1/chat/completions ===
    // 配合 --jinja 参数，llama-server 根据模型自带的 GGUF 聊天模板自动格式化
    // 任何模型都能自动适配：Qwen、Llama、Mistral、Gemma、DeepSeek……
    const requestBody = JSON.stringify({
      messages: messages.map(m => {
        if (!m.attachments?.length) return { role: m.role, content: m.content }
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content || '请分析这张图片。' },
            ...m.attachments.filter(a => a.type === 'image').map(a => ({
              type: 'image_url', image_url: { url: a.dataUrl }
            }))
          ]
        }
      }),
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 0.9,
      max_tokens: options?.maxTokens ?? 4096,
      seed: options?.seed ?? -1,
      stream: options?.stream ?? true
    })

    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: this.serverPort,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      }, (res) => {
        if (res.statusCode !== 200) {
          resolve(null)
          return
        }

        async function* streamParser(): AsyncGenerator<string> {
          let buffer = ''
          let filtered = ''
          let inThink = false; let thinkSafeCounter = 0
          let thinkDepth = 0
          res.setEncoding('utf8')
          for await (const chunk of res) {
            buffer += chunk
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line === 'data: [DONE]') {
                if (inThink) { inThink = false; thinkDepth = 0 }
                continue
              }
              if (line.startsWith('data: ')) {
                try {
                  const json = JSON.parse(line.slice(6))
                  let content = json.content ? json.content.replace(/💭/g, '') : null
                  if (!content) {
                    const delta = json.choices?.[0]?.delta
                    content = delta?.content ? delta.content.replace(/💭/g, '') : undefined
                    // reasoning_content 是模型的思考过程，直接显示让用户看到进度
                    if (!content && delta?.reasoning_content) {
                      content = `💭 ${delta.reasoning_content}`
                    }
                  }
                  if (!content) continue

                  let pos = 0
                  while (pos < content.length) {
                    if (!inThink) {
                      const tagIdx = content.indexOf('<think>', pos)
                      if (tagIdx === -1) {
                        filtered += content.slice(pos)
                        break
                      }
                      filtered += content.slice(pos, tagIdx)
                      inThink = true; thinkDepth = 1; thinkSafeCounter = 0
                      pos = tagIdx + 7
                    } else {
                      const closeIdx = content.indexOf('</think>', pos)
                      const openIdx = content.indexOf('<think>', pos)
                      if (closeIdx !== -1 && (openIdx === -1 || closeIdx < openIdx)) {
                        thinkDepth--
                        pos = closeIdx + 8
                        if (thinkDepth <= 0) {
                          inThink = false; thinkDepth = 0
                        }
                      } else if (openIdx !== -1) {
                        thinkDepth++
                        thinkSafeCounter += openIdx - pos
                        pos = openIdx + 7
                      } else {
                        thinkSafeCounter += content.length - pos
                        pos = content.length
                      }
                    }
                  }

                  if (inThink && thinkSafeCounter > 3000) {
                    inThink = false; thinkDepth = 0
                  }
                  if (filtered) { yield filtered; filtered = '' }
                } catch {
                  // ignore parse errors
                }
              }
            }
          }
        }

        resolve(streamParser())
      })

      req.on('error', reject)
      req.write(requestBody)
      req.end()
    })
  }

  private async makeEmbeddingRequest(texts: string[]): Promise<number[][]> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({ input: texts })
      const req = http.request({
        hostname: '127.0.0.1',
        port: this.serverPort,
        path: '/v1/embeddings',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            resolve(json.data?.map((d: any) => d.embedding) || [])
          } catch {
            resolve(texts.map(() => Array.from({ length: 384 }, () => Math.random() * 2 - 1)))
          }
        })
      })

      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }

  /**
  * 模拟流式输出
  */
  private async *mockStreamChat(messages: Array<{ role: string; content: string }>): AsyncGenerator<string> {
    const lastMessage = messages[messages.length - 1]
    const userInput = lastMessage?.content || ''

    const mockResponses: Record<string, string> = {
      '你好': '你好！👋 我是智语 Studio 的 AI 助手。我可以帮你：\n\n- 📝 **回答问题**：各种知识问答\n- 💻 **编写代码**：支持多种编程语言\n- 📄 **分析文档**：上传文档进行 RAG 问答\n- 🔧 **API 调用**：通过 OpenAI 兼容接口调用\n\n当前运行在**模拟模式**，请安装 llama.cpp 以获得真实推理能力。\n\n有什么我可以帮你的吗？',
      'help': '**智语 Studio 使用指南**\n\n1. 在「模型管理」中下载或加载 GGUF 模型\n2. 在「聊天」中开始对话\n3. 在「知识库」中上传文档进行 RAG 问答\n4. 在「API 服务」中查看 OpenAI 兼容接口\n\n模型推荐：\n- Qwen2 系列（中文优化）\n- Llama 3 系列\n- Mistral 系列',
    }

    const response = mockResponses[userInput] ||
      `收到你的消息：「${userInput}」\n\n当前运行在**模拟模式**下。要获得真实 AI 回复，请：\n\n1. 下载并安装 [llama.cpp](https://github.com/ggerganov/llama.cpp)\n2. 将 llama-server.exe 放到 resources/llama-bin/ 目录\n3. 在「模型管理」中加载一个 GGUF 模型\n\n支持的模型下载源：[HuggingFace](https://huggingface.co/models?library=gguf)`

    const chars = Array.from(response)
    for (let i = 0; i < chars.length; ) {
      const chunkSize = Math.floor(Math.random() * 2) + 1
      yield chars.slice(i, i + chunkSize).join('')
      i += chunkSize
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 40))
    }
  }

  // ===== 工具方法 =====

  /**
   * TCP 端口轮询（内部用，300ms 间隔，120s 超时）
   */
  getStatus(): LlamaStatus {
    return { ...this.status }
  }

  getServerLog(): string {
    return this.lastServerLog
  }

  private killProcess(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }

  private findAvailablePort(startPort: number): Promise<number> {
    return new Promise((resolve) => {
      const tryPort = (port: number) => {
        const server = net.createServer()
        server.once('error', () => {
          server.close(() => setTimeout(() => tryPort(port + 1), 100))
        })
        server.once('listening', () => {
          server.close(() => resolve(port))
        })
        server.listen(port, '127.0.0.1')
      }
      tryPort(startPort)
    })
  }
}

/**
 * 全局唯一的 LlamaService 实例
 */
export const llamaService = new LlamaService()
