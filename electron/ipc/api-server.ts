/**
 * 智语 Studio — 本地 API 服务器
 * 提供 OpenAI 兼容的 REST API 接口
 */
import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import http from 'http'
import { logger } from '../utils/logger'
import { llamaService } from '../services/llama-service'

export class APIServer {
  private app: Express
  private server: http.Server | null = null
  private port: number = 1234
  private isRunning: boolean = false
  private llamaService: typeof llamaService

  constructor() {
    this.app = express()
    this.llamaService = llamaService
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware(): void {
    this.app.use(cors())
    this.app.use(express.json({ limit: '10mb' }))
  }

  private setupRoutes(): void {
    // 健康检查
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        modelLoaded: this.llamaService.getStatus().isLoaded,
        uptime: process.uptime()
      })
    })

    // 模型列表
    this.app.get('/v1/models', (_req: Request, res: Response) => {
      const status = this.llamaService.getStatus()
      const models = status.isLoaded && status.modelName
        ? [{ id: status.modelName, object: 'model', owned_by: 'zhiyu-studio' }]
        : []
      res.json({ object: 'list', data: models })
    })

    // 聊天补全（OpenAI 兼容）
    this.app.post('/v1/chat/completions', async (req: Request, res: Response) => {
      try {
        const { messages, stream = false, temperature, max_tokens, top_p } = req.body

        if (!messages || !Array.isArray(messages)) {
          res.status(400).json({ error: { message: '缺少 messages 参数', type: 'invalid_request_error' } })
          return
        }

        if (stream) {
          // 流式响应 (SSE)
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.flushHeaders()

          try {
            const generator = this.llamaService.streamChat(messages, {
              temperature,
              maxTokens: max_tokens,
              topP: top_p
            })

            for await (const chunk of generator) {
              const data = JSON.stringify({
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: this.llamaService.getStatus().modelName || 'unknown',
                choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
              })
              res.write(`data: ${data}\n\n`)
            }

            // 发送结束标记
            res.write(`data: ${JSON.stringify({
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: this.llamaService.getStatus().modelName || 'unknown',
              choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
            })}\n\n`)
            res.write('data: [DONE]\n\n')
            res.end()
          } catch (error) {
            logger.error('流式响应出错', error as Error)
            if (!res.writableEnded) {
              res.end()
            }
          }
        } else {
          // 非流式响应
          const response = await this.llamaService.chat(messages, {
            temperature,
            maxTokens: max_tokens,
            topP: top_p
          })

          res.json({
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: this.llamaService.getStatus().modelName || 'unknown',
            choices: [{
              index: 0,
              message: { role: 'assistant', content: response },
              finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          })
        }
      } catch (error) {
        logger.error('聊天补全请求失败', error as Error)
        res.status(500).json({
          error: { message: '服务器内部错误', type: 'server_error' }
        })
      }
    })

    // 文本向量化
    this.app.post('/v1/embeddings', async (req: Request, res: Response) => {
      try {
        const { input } = req.body
        const status = this.llamaService.getStatus()

        if (!status.isLoaded) {
          res.status(503).json({ error: { message: '没有加载模型', type: 'server_error' } })
          return
        }

        if (!status.supportsEmbedding) {
          res.status(400).json({ error: { message: '当前模型不支持向量化', type: 'invalid_request_error' } })
          return
        }

        const texts = Array.isArray(input) ? input : [input]
        const embeddings = await this.llamaService.embed(texts)

        res.json({
          object: 'list',
          data: embeddings.map((embedding, i) => ({
            object: 'embedding',
            index: i,
            embedding
          }))
        })
      } catch (error) {
        logger.error('向量化请求失败', error as Error)
        res.status(500).json({
          error: { message: '向量化失败', type: 'server_error' }
        })
      }
    })
  }

  async start(port?: number): Promise<void> {
    if (this.isRunning) return

    this.port = port || 1234
    let retries = 0
    const maxRetries = 10

    return new Promise((resolve, reject) => {
      const doStart = () => {
      this.server = this.app.listen(this.port, '127.0.0.1', () => {
        this.isRunning = true
        logger.info(`API 服务器已启动: http://127.0.0.1:${this.port}`)
        resolve()
      })

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
            retries++
            if (retries > maxRetries) {
              reject(new Error(`端口范围 ${this.port - retries + 1}-${this.port} 均被占用，无法启动 API 服务器`))
              return
            }
            logger.warn(`端口 ${this.port} 已被占用，尝试端口 ${this.port + 1}（${retries}/${maxRetries}）`)
          this.port++
          this.server?.close()
            // 延迟 200ms 再试，避免旧 socket 未完全释放
            setTimeout(doStart, 200)
        } else {
          logger.error('API 服务器启动失败', error)
          reject(error)
        }
      })
      }
      doStart()
    })
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) return

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false
        this.server = null
        logger.info('API 服务器已停止')
        resolve()
      })
    })
  }

  getPort(): number {
    return this.port
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      address: `http://127.0.0.1:${this.port}`
    }
  }
}
