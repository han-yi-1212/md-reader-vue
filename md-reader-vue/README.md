# 📖 MD Reader Vue

一个优雅的 Vue 3 Markdown 阅读器，支持实时预览、代码高亮、目录导航和暗黑模式。

**[🌐 在线预览](https://han-yi-1212.github.io/md-reader-vue)** | **[📂 GitHub 仓库](https://github.com/han-yi-1212/md-reader-vue)**

---

## ✨ 功能特性

| 功能 | 描述 |
|------|------|
| 📁 **文件上传** | 支持点击上传 `.md` 文件，或直接拖拽到阅读器 |
| 👀 **实时预览** | 编辑内容即时渲染为 HTML，无需刷新 |
| 📐 **分屏模式** | 左右分屏编辑/预览，可拖动分隔条调整比例 |
| 📑 **目录导航** | 自动解析标题生成侧边栏，点击平滑滚动定位 |
| 🎨 **代码高亮** | 基于 highlight.js，支持 190+ 编程语言 |
| 🌙 **暗黑模式** | 一键切换亮/暗主题，自动记忆用户偏好 |
| 📐 **LaTeX 公式** | 支持 $...$ 行内公式和 $$...$$ 块级公式（KaTeX 渲染） |
| 📱 **响应式设计** | 适配桌面端和移动端 |

---

## 🛠️ 技术栈

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3-42b883?logo=vue.js" alt="Vue">
  <img src="https://img.shields.io/badge/Vite-5-646cff?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/highlight.js-11-3572A5?logo=javascript" alt="highlight.js">
  <img src="https://img.shields.io/badge/KaTeX-matH-b15C89?logo=katex" alt="KaTeX">
</p>

- **框架**：Vue 3 + Composition API + `<script setup>`
- **构建工具**：Vite 5
- **样式**：Tailwind CSS v4
- **Markdown 解析**：markdown-it v14
- **数学公式**：KaTeX + auto-render（DOM 扫描渲染）
- **代码高亮**：highlight.js
- **图标**：Lucide Vue Next

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18.x
- npm ≥ 9.x 或 pnpm ≥ 8.x

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/han-yi-1212/md-reader-vue.git
cd md-reader-vue

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

然后打开 [http://localhost:5173](http://localhost:5173)

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录。

---

## 📂 项目结构

```
md-reader-vue/
├── src/
│   ├── components/          # Vue 组件
│   │   ├── AppHeader.vue    # 顶部工具栏
│   │   ├── TocSidebar.vue   # 目录侧边栏
│   │   ├── EditorPane.vue   # 编辑区
│   │   ├── PreviewPane.vue  # 预览区
│   │   └── DropZone.vue     # 拖拽遮罩
│   ├── composables/         # 可复用逻辑
│   │   ├── useMarkdown.js   # Markdown 解析
│   │   ├── useTheme.js      # 主题切换
│   │   └── useFileHandler.js # 文件处理
│   ├── App.vue              # 根组件
│   ├── main.js              # 入口文件
│   └── style.css            # 全局样式
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## ⌨️ 快捷操作

| 操作 | 方式 |
|------|------|
| 上传文件 | 点击工具栏 📂 图标 或直接拖拽文件到页面 |
| 切换模式 | 点击工具栏 **编辑** / **预览** / **分屏** |
| 切换主题 | 点击工具栏 🌙 / ☀️ 图标 |
| 编辑器 Tab | 按 `Tab` 键插入 2 个空格 |

---

## 🔧 配置说明

### markdown-it 自定义渲染

项目已配置以下增强：

- **标题锚点**：自动为 H1-H6 添加 `id` 属性，便于目录跳转
- **外链新窗口**：所有外部链接在「新标签页」打开
- **代码块高亮**：集成 highlight.js，支持语言自动检测

### LaTeX 公式渲染（KaTeX + auto-render）

采用两阶段架构：

1. **Stage 1**：markdown-it 将 Markdown 解析为 HTML（LaTeX 公式保持为源码文本）
2. **Stage 2**：auto-render 扫描 DOM 文本节点，将 `$...$` / `$$...$$` / `\[...\]` / `\(...\)` 替换为 KaTeX HTML

```javascript
// auto-render 配置（MarkdownViewer.vue）
autoRender(viewerRef.value, {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
  ],
  throwOnError: false,  // 无效 LaTeX 显示错误样式，不崩溃
  trust: true,          // ⚠️ 生产环境建议设为 false
})
```

### 暗黑模式

主题状态通过 `localStorage` 持久化，首次访问时自动检测系统偏好（`prefers-color-scheme`）。

---

## 📝 License

MIT © [han-yi-1212](https://github.com/han-yi-1212)
