# 智语 Studio (ZhiYu Studio)

> 🌐 一款 **100% 汉化**的本地大语言模型桌面应用

智语 Studio 是一款类似 LM Studio 的桌面软件，让您在 Windows 上轻松运行、管理和使用开源大语言模型 (LLM)。所有界面、提示和文档完全中文化。

## ✨ 核心功能

- 💬 **智能聊天** — 流式对话、Markdown 渲染、代码高亮、多会话管理
- 📦 **模型管理** — 本地 GGUF 模型扫描、HuggingFace 浏览下载、一键加载
- 📚 **RAG 知识库** — 上传 PDF/DOCX/TXT 文档，基于文档内容进行检索增强问答
- 🔗 **OpenAI 兼容 API** — 提供 `/v1/chat/completions` 等标准接口
- 🖥️ **GPU 加速** — 支持 NVIDIA CUDA / Vulkan 推理加速
- 🔒 **完全离线** — 所有数据处理都在本地完成，保护隐私安全

## 🚀 快速开始

### 环境要求

- Windows 10/11 (64位)
- Node.js 18+
- npm 或 yarn

### 开发模式运行

```bash
# 克隆项目
git clone <repo-url>
cd zhiyu-studio

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 构建安装包

```bash
# 构建 Windows 安装包
npm run build:win
```

安装包会生成在 `release/` 目录下。

## 📁 项目结构

```
zhiyu-studio/
├── electron/                # Electron 主进程
│   ├── main.ts              # 入口：窗口管理
│   ├── preload.ts           # IPC 桥接
│   ├── ipc/                 # IPC 处理器
│   │   ├── model-handler.ts
│   │   ├── chat-handler.ts
│   │   ├── rag-handler.ts
│   │   ├── settings-handler.ts
│   │   └── api-server.ts    # Express API 服务器
│   ├── services/            # 核心服务
│   │   ├── llama-service.ts # llama.cpp 进程管理
│   │   ├── model-manager.ts # 模型扫描/搜索
│   │   ├── download-service.ts
│   │   ├── session-manager.ts
│   │   ├── rag-service.ts   # RAG 引擎
│   │   ├── gpu-detector.ts
│   │   └── settings-service.ts
│   └── utils/
├── src/                     # React 渲染进程
│   ├── pages/               # 页面组件
│   ├── components/          # UI 组件
│   │   ├── chat/            # 聊天相关
│   │   ├── models/          # 模型管理
│   │   ├── rag/             # 知识库
│   │   └── common/          # 通用组件
│   ├── stores/              # Zustand 状态管理
│   ├── services/            # IPC 客户端
│   ├── types/               # TypeScript 类型
│   └── i18n/                # 中文语言包
└── resources/               # 静态资源
```

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Electron | 跨平台桌面应用 |
| 前端 | React + TypeScript + Vite | 现代前端开发 |
| UI 组件 | Ant Design 5 | 中文国际化支持 |
| 状态管理 | Zustand | 轻量状态管理 |
| 推理引擎 | llama.cpp | C++ 高性能推理 |
| API 服务 | Express.js | OpenAI 兼容接口 |
| 文档解析 | pdf-parse / mammoth | PDF / DOCX 解析 |

## 📄 开源协议

MIT License
