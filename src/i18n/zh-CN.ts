/**
 * 智语 Studio — 中文语言包
 * 所有界面文案的完整汉化
 */
const zhCN = {
  app: {
    name: '智语 Studio',
    shortName: '智语',
    slogan: '本地大语言模型桌面应用',
    version: '版本',
  },

  menu: {
    chat: '聊天',
    models: '模型管理',
    knowledgeBase: '知识库',
    apiService: 'API 服务',
    settings: '设置',
  },

  // ============ 聊天页面 ============
  chat: {
    newSession: '新建对话',
    sessionList: '对话列表',
    noSessions: '暂无对话记录',
    searchSessions: '搜索对话...',
    deleteSession: '删除对话',
    deleteConfirm: '确定要删除这个对话吗？此操作不可恢复。',
    renameSession: '重命名对话',
    inputPlaceholder: '输入你的问题...（Shift+Enter 换行，Enter 发送）',
    send: '发送',
    stopGeneration: '停止生成',
    thinking: '思考中...',
    emptyChat: {
      title: '智语 Studio',
      subtitle: '选择一个模型开始对话',
      tip: '在「模型管理」中加载 GGUF 模型后即可开始',
      goToModels: '前往模型管理',
    },
    streaming: '正在生成回复...',
    tokensGenerated: '已生成 {count} tokens',
    contextUsed: '上下文使用: {used}/{total}',
    copyMessage: '复制消息',
    regenerate: '重新生成',
    editMessage: '编辑消息',
    deleteMessage: '删除消息',
    systemPrompt: '系统提示词',
    systemPromptDesc: '设定 AI 的角色和行为方式',
  },

  // ============ 模型管理 ============
  models: {
    title: '模型管理',
    localModels: '本地模型',
    downloadModels: '模型下载',
    searchLocal: '搜索本地模型...',
    searchHF: '搜索 HuggingFace 模型...',
    noModels: '暂无本地模型',
    noModelsTip: '从 HuggingFace 下载 GGUF 模型，或手动将 .gguf 文件放入模型目录',
    loadModel: '加载模型',
    unloadModel: '卸载模型',
    modelLoaded: '已加载',
    modelNotLoaded: '未加载',
    deleteModel: '删除模型',
    deleteConfirm: '确定要删除此模型吗？',
    parameters: '参数',
    quantization: '量化',
    fileSize: '文件大小',
    contextSize: '上下文长度',
    modelInfo: '模型信息',
    refreshing: '刷新中...',
    addLocalModel: '添加本地模型',
    openModelsFolder: '打开模型文件夹',

    // 下载相关
    downloading: '下载中',
    downloadComplete: '下载完成',
    downloadFailed: '下载失败',
    downloadCancelled: '已取消',
    downloadSpeed: '下载速度',
    cancelDownload: '取消下载',
    retryDownload: '重新下载',
    downloads: '下载记录',

    // 模型配置
    config: '模型参数配置',
    gpuLayers: 'GPU 加速层数',
    gpuLayersTip: '设为 -1 表示所有层都在 GPU 上运行，0 表示纯 CPU',
    threads: 'CPU 线程数',
    threadsTip: '推理时使用的 CPU 线程数量',
    temperature: '温度 (Temperature)',
    temperatureTip: '值越大回复越随机，越小越确定',
    topP: '核采样 (Top-P)',
    topPTip: '限制词汇选择范围，推荐 0.9',
    maxTokens: '最大输出长度',
    maxTokensTip: '单次回复的最大 token 数量',
    saveConfig: '保存配置',
    resetConfig: '恢复默认',
  },

  // ============ 知识库 ============
  rag: {
    title: '知识库',
    uploadDocument: '上传文档',
    uploadTip: '支持 PDF、DOCX、TXT、Markdown 格式',
    dragUpload: '点击或拖拽文件到此处上传',
    myDocuments: '我的文档',
    noDocuments: '暂无文档',
    noDocumentsTip: '上传文档后，AI 可以基于文档内容回答问题',
    deleteDocument: '删除文档',
    deleteConfirm: '确定要删除此文档及其索引吗？',
    searchPlaceholder: '搜索知识库内容...',
    chunks: '文本块',
    uploadTime: '上传时间',
    knowledgeBase: '知识库',
    allKnowledgeBases: '全部知识库',
    createKB: '新建知识库',
    defaultKB: '默认知识库',
    stats: '知识库统计',
    totalDocs: '文档总数',
    totalChunks: '文本块总数',
    totalSize: '总大小',
    reparse: '重新解析',
    parsing: '解析中...',

    // RAG 聊天
    ragMode: 'RAG 检索增强模式',
    ragModeDesc: '基于知识库文档回答问题',
    sources: '参考来源',
    noRelevant: '未找到相关文档内容',
    searchResults: '找到 {count} 个相关内容',
  },

  // ============ API 服务 ============
  api: {
    title: 'API 服务',
    status: '服务状态',
    running: '运行中',
    stopped: '已停止',
    endpoint: '接口地址',
    port: '端口号',
    startServer: '启动服务',
    stopServer: '停止服务',
    restartServer: '重启服务',
    healthCheck: '健康检查',

    endpoints: '接口列表',
    chatCompletions: '聊天补全',
    embeddings: '文本向量化',
    modelsList: '模型列表',

    usage: '使用示例',
    curlExample: 'cURL 示例',
    pythonExample: 'Python 示例',
    jsExample: 'JavaScript 示例',

    quickStart: '快速开始',
    apiDocs: '接口文档',
    compatibleWith: '完全兼容 OpenAI API 格式',

    curlCommand: `curl http://{address}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "local-model",
    "messages": [{"role": "user", "content": "你好！"}],
    "stream": true
  }'`,

    pythonCode: `from openai import OpenAI

client = OpenAI(
    base_url="http://{address}/v1",
    api_key="not-needed"
)

response = client.chat.completions.create(
    model="local-model",
    messages=[{"role": "user", "content": "你好！"}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content, end="")`,

    jsCode: `// 使用任何 OpenAI 兼容客户端
const response = await fetch('http://{address}/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'local-model',
    messages: [{ role: 'user', content: '你好！' }],
    stream: true
  })
})

const reader = response.body.getReader()
const decoder = new TextDecoder()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  console.log(decoder.decode(value))
}`,
  },

  // ============ 设置 ============
  settings: {
    title: '设置',
    general: '通用设置',
    model: '模型设置',
    appearance: '外观设置',

    // 通用
    language: '界面语言',
    chinese: '中文',
    english: 'English',
    modelsPath: '模型存储路径',
    modelsPathTip: 'GGUF 模型的默认存储目录',
    changePath: '更改路径',
    autoLoadLastModel: '启动时自动加载上次模型',
    autoStartAPI: '启动时自动开启 API 服务',
    apiPort: 'API 服务端口',
    apiPortTip: '默认 1234，与 OpenAI API 兼容',

    // 外观
    theme: '主题模式',
    light: '浅色',
    dark: '深色',
    auto: '跟随系统',

    // 关于
    about: '关于智语 Studio',
    aboutDesc: '一款 100% 中文化的本地大语言模型桌面应用。基于 llama.cpp 提供高性能本地推理，支持 RAG 知识库检索增强和 OpenAI 兼容 API。',
    github: '项目地址',
    feedback: '问题反馈',
    checkUpdate: '检查更新',
    license: '开源协议',
  },

  // ============ 通用操作 ============
  common: {
    confirm: '确定',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    search: '搜索',
    refresh: '刷新',
    loading: '加载中...',
    empty: '暂无数据',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    close: '关闭',
    more: '更多',
    copy: '复制',
    copied: '已复制',
    paste: '粘贴',
    upload: '上传',
    download: '下载',
    retry: '重试',
    export: '导出',
    import: '导入',
    yes: '是',
    no: '否',
    on: '开',
    off: '关',
    success: '操作成功',
    failed: '操作失败',
    confirmAction: '确认操作',
    tip: '提示',
    warning: '警告',
    error: '错误',
  },

  // ============ 错误提示 ============
  error: {
    modelNotFound: '模型文件未找到',
    modelLoadFailed: '模型加载失败，请检查文件格式',
    downloadFailed: '模型下载失败，请检查网络连接',
    networkError: '网络连接失败，请检查网络设置',
    fileReadFailed: '文件读取失败',
    fileTooLarge: '文件过大，请尝试拆分后上传',
    noModelLoaded: '请先加载一个模型',
    unsupportedFormat: '不支持的文件格式',
    serverStartFailed: 'API 服务启动失败，端口可能被占用',
    unknownError: '发生未知错误，请查看日志',
    gpuDetectFailed: 'GPU 检测失败',
    sessionNotFound: '会话不存在',
    emptyMessage: '消息内容不能为空',
    contextExceeded: '上下文超出限制，请缩短输入或调整上下文设置',
  },

  // ============ 状态栏 ============
  statusBar: {
    model: '模型',
    noModel: '未加载模型',
    memory: '内存',
    cpu: 'CPU',
    gpu: 'GPU',
    apiServer: 'API 服务',
    serverOn: '已开启',
    serverOff: '已关闭',
  },

  // ============ GPU 状态 ============
  gpu: {
    detected: '检测到',
    notDetected: '未检测到 GPU',
    devices: '{count} 个设备',
    totalMemory: '总显存',
    backend: '推理后端',
    cuda: 'CUDA',
    vulkan: 'Vulkan',
    metal: 'Metal (Apple)',
    cpuOnly: '纯 CPU',
  },
}

export default zhCN
export type LanguagePack = typeof zhCN
