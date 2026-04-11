# MD Reader Vue 项目文档

## 1. 项目概览

MD Reader Vue 是一个优雅的 Vue 3 Markdown 阅读器，支持实时预览、代码高亮、目录导航和暗黑模式。

- **实时预览**：编辑内容即时渲染为 HTML，无需刷新
- **分屏模式**：左右分屏编辑/预览，可拖动分隔条调整比例
- **目录导航**：自动解析标题生成侧边栏，点击平滑滚动定位
- **代码高亮**：基于 highlight.js，支持 190+ 编程语言
- **暗黑模式**：一键切换亮/暗主题，自动记忆用户偏好
- **LaTeX 公式**：支持 $...$ 行内公式和 $$...$$ 块级公式（KaTeX 渲染）
- **响应式设计**：适配桌面端和移动端

## 2. 目录结构

项目采用标准的 Vue 3 + Vite 项目结构，清晰地分离了组件、可复用逻辑和资源文件。

```text
md-reader-vue/
├── src/
│   ├── components/          # Vue 组件
│   │   ├── AppHeader.vue    # 顶部工具栏
│   │   ├── TocSidebar.vue   # 目录侧边栏
│   │   ├── EditorPane.vue   # 编辑区
│   │   ├── PreviewPane.vue  # 预览区
│   │   ├── MarkdownViewer.vue # Markdown 渲染
│   │   └── DropZone.vue     # 拖拽遮罩
│   ├── composables/         # 可复用逻辑
│   │   ├── useMarkdown.js   # Markdown 解析
│   │   ├── useTheme.js      # 主题切换
│   │   └── useFileHandler.js # 文件处理
│   ├── assets/              # 静态资源
│   │   ├── hero.png
│   │   └── vite.svg
│   ├── App.vue              # 根组件
│   ├── main.js              # 入口文件
│   └── style.css            # 全局样式
├── public/                  # 公共文件
│   ├── favicon.svg
│   └── icons.svg
├── index.html               # HTML 模板
├── vite.config.js           # Vite 配置
├── tailwind.config.js       # Tailwind 配置
└── package.json             # 项目依赖
```

## 3. 系统架构与主流程

### 3.1 系统架构

MD Reader Vue 采用组件化架构，基于 Vue 3 Composition API 构建。系统分为以下几层：

1. **UI 组件层**：负责用户界面渲染，包括编辑器、预览区、目录侧边栏等
2. **业务逻辑层**：通过 composables 封装核心功能，如 Markdown 解析、主题管理、文件处理
3. **依赖层**：使用第三方库实现特定功能，如 markdown-it 用于解析、KaTeX 用于公式渲染、highlight.js 用于代码高亮

### 3.2 主流程

1. **初始化流程**：
   - 加载应用依赖和样式
   - 初始化主题（读取 localStorage 或检测系统偏好）
   - 加载默认 Markdown 内容

2. **编辑预览流程**：
   - 用户在编辑器输入 Markdown 内容
   - 内容变化触发 Markdown 解析
   - 解析结果实时渲染到预览区
   - 同时提取标题生成目录

3. **文件处理流程**：
   - 用户上传或拖拽 Markdown 文件
   - 读取文件内容
   - 解析内容并显示
   - 更新文件名显示

4. **主题切换流程**：
   - 用户点击主题切换按钮
   - 切换 isDark 状态
   - 更新 DOM class 和 localStorage
   - 触发 UI 样式变化

### 3.3 数据流

- **单向数据流**：从父组件向子组件传递 props，子组件通过事件向父组件传递变化
- **响应式状态**：使用 Vue 3 的 ref 和 computed 管理状态
- **共享状态**：通过 composables 实现跨组件状态共享（如主题状态）

## 4. 核心功能模块

### 4.1 Markdown 解析与渲染

**功能说明**：将 Markdown 文本解析为 HTML，并支持 LaTeX 公式渲染和代码高亮。

**实现方式**：
- 使用 [marked](https://marked.js.org/) 库解析 Markdown
- 使用 [KaTeX](https://katex.org/) 渲染数学公式
- 使用 [highlight.js](https://highlightjs.org/) 实现代码高亮
- 使用 [isomorphic-dompurify](https://github.com/cure53/DOMPurify) 进行 XSS 防护

**核心代码**：
- [useMarkdown.js](file:///workspace/src/composables/useMarkdown.js)：封装 Markdown 解析逻辑
- [MarkdownViewer.vue](file:///workspace/src/components/MarkdownViewer.vue)：负责渲染解析后的 HTML

**公式渲染流程**：
1. 提取 Markdown 中的 $...$ 和 $$...$$ 公式
2. 用占位符替换公式内容
3. 解析剩余 Markdown 为 HTML
4. 将占位符替换为 KaTeX 渲染的 HTML
5. 净化 HTML 防止 XSS

### 4.2 主题管理

**功能说明**：实现亮色/暗色主题切换，并持久化用户偏好。

**实现方式**：
- 使用 localStorage 存储主题偏好
- 支持系统偏好检测
- 通过 CSS class 切换主题样式

**核心代码**：
- [useTheme.js](file:///workspace/src/composables/useTheme.js)：管理主题状态和切换逻辑

### 4.3 文件处理

**功能说明**：支持通过点击上传或拖拽方式加载 Markdown 文件。

**实现方式**：
- 使用 FileReader API 读取文件内容
- 支持文件类型和大小验证
- 提供错误处理和用户反馈

**核心代码**：
- [useFileHandler.js](file:///workspace/src/composables/useFileHandler.js)：处理文件上传和拖拽逻辑
- [DropZone.vue](file:///workspace/src/components/DropZone.vue)：实现拖拽界面

### 4.4 目录导航

**功能说明**：自动解析 Markdown 标题生成目录，并支持点击导航。

**实现方式**：
- 从 Markdown 文本中提取标题
- 生成标题锚点
- 使用 IntersectionObserver 监听标题可见性
- 实现平滑滚动导航

**核心代码**：
- [useMarkdown.js](file:///workspace/src/composables/useMarkdown.js)：提取标题生成目录数据
- [TocSidebar.vue](file:///workspace/src/components/TocSidebar.vue)：显示目录并处理导航
- [PreviewPane.vue](file:///workspace/src/components/PreviewPane.vue)：监听标题可见性更新当前激活锚点

### 4.5 视图模式切换

**功能说明**：支持编辑模式、预览模式和分屏模式切换。

**实现方式**：
- 使用条件渲染切换不同视图
- 实现分屏拖拽调整比例
- 提供模式切换按钮

**核心代码**：
- [App.vue](file:///workspace/src/App.vue)：管理视图模式状态
- [AppHeader.vue](file:///workspace/src/components/AppHeader.vue)：提供模式切换按钮

## 5. 核心 API/类/函数

### 5.1 useMarkdown 组合式函数

**功能**：封装 Markdown 解析和目录提取逻辑

**主要方法**：
- `parseMarkdown(markdownText)`：将 Markdown 文本解析为安全的 HTML
  - **参数**：`markdownText` (string) - 原始 Markdown 文本
  - **返回值**：(string) - 解析后的安全 HTML 字符串

- `extractToc(markdownText)`：从 Markdown 文本中提取标题生成目录
  - **参数**：`markdownText` (string) - 原始 Markdown 文本
  - **返回值**：(Array) - 标题数组，格式为 `[{ level, text, anchor, id }]`

**核心流程**：
1. 提取并渲染公式
2. 使用 marked 解析 Markdown
3. 恢复公式渲染结果
4. 净化 HTML 防止 XSS

### 5.2 useTheme 组合式函数

**功能**：管理主题状态和切换

**主要方法**：
- `toggleTheme()`：切换主题
- `setTheme(dark)`：设置指定主题
  - **参数**：`dark` (boolean) - true 为暗色，false 为亮色
- `initTheme()`：初始化主题（读取 localStorage 或检测系统偏好）

**状态**：
- `isDark`：(ref) - 当前是否为暗色模式

### 5.3 useFileHandler 组合式函数

**功能**：处理文件上传和拖拽逻辑

**主要方法**：
- `handleFileSelect(event, onSuccess)`：处理文件选择事件
  - **参数**：
    - `event` (Event) - input change 事件
    - `onSuccess` (Function) - 成功回调，接收文件内容字符串

- `handleDrop(event, onSuccess)`：处理拖拽放下事件
  - **参数**：
    - `event` (DragEvent) - drop 事件
    - `onSuccess` (Function) - 成功回调

**状态**：
- `isDragging`：(ref) - 是否正在拖拽
- `fileName`：(ref) - 当前加载的文件名
- `fileError`：(ref) - 错误信息

### 5.4 App 组件

**功能**：应用根组件，整合所有子组件和业务逻辑

**主要状态**：
- `markdownContent`：(ref) - Markdown 原始内容
- `viewMode`：(ref) - 视图模式 ('edit' | 'split' | 'preview')
- `tocVisible`：(ref) - 目录是否可见
- `splitRatio`：(ref) - 分屏模式下左侧占比
- `activeAnchor`：(ref) - 当前激活的标题锚点

**主要方法**：
- `startResize(e)`：开始调整分屏比例
- `onResize(e)`：调整分屏比例
- `stopResize()`：停止调整分屏比例
- `handleGlobalDragEnter(e)`：处理全局拖拽进入事件
- `handleGlobalDrop(e)`：处理全局拖拽放下事件

### 5.5 EditorPane 组件

**功能**：Markdown 编辑区

**Props**：
- `modelValue`：(string) - 编辑器内容（双向绑定）

**主要方法**：
- `updateCursor()`：更新光标位置显示
- `handleKeydown(e)`：处理键盘事件（如 Tab 键插入空格）

### 5.6 PreviewPane 组件

**功能**：Markdown 预览区

**Props**：
- `htmlContent`：(string) - 已渲染的 HTML 字符串

**主要方法**：
- `setupHeadingObserver()`：设置标题可见性观察器

### 5.7 TocSidebar 组件

**功能**：目录侧边栏

**Props**：
- `headings`：(Array) - 标题数组
- `activeAnchor`：(string) - 当前激活的锚点
- `wordCount`：(number) - 文档字数

**主要方法**：
- `scrollToHeading(anchor)`：平滑滚动到指定锚点

## 6. 技术栈与依赖

| 技术/依赖 | 版本 | 用途 | 来源 |
|-----------|------|------|------|
| Vue | 3.5.32 | 前端框架 | [package.json](file:///workspace/package.json) |
| Vite | 8.0.4 | 构建工具 | [package.json](file:///workspace/package.json) |
| Tailwind CSS | 4.2.2 | 样式框架 | [package.json](file:///workspace/package.json) |
| marked | 14.1.1 | Markdown 解析 | [package.json](file:///workspace/package.json) |
| highlight.js | 11.11.1 | 代码高亮 | [package.json](file:///workspace/package.json) |
| KaTeX | 0.16.45 | 数学公式渲染 | [package.json](file:///workspace/package.json) |
| lucide-vue-next | 1.0.0 | 图标库 | [package.json](file:///workspace/package.json) |
| isomorphic-dompurify | 3.7.1 | XSS 防护 | [package.json](file:///workspace/package.json) |

## 7. 关键模块与典型用例

### 7.1 Markdown 编辑与预览

**功能说明**：在编辑器中输入 Markdown 内容，实时在预览区查看渲染效果。

**使用步骤**：
1. 在左侧编辑器中输入 Markdown 内容
2. 右侧预览区实时显示渲染结果
3. 可点击顶部工具栏切换视图模式（编辑/分屏/预览）

**示例**：
```markdown
# 标题

**粗体**和*斜体*文本

```javascript
// 代码块
console.log('Hello Markdown!');
```

$E = mc^2$  // 行内公式

$$
a^2 + b^2 = c^2
$$  // 块级公式
```

### 7.2 文件上传与拖拽

**功能说明**：支持通过点击上传按钮或拖拽方式加载 Markdown 文件。

**使用步骤**：
1. 点击顶部工具栏的「上传」按钮选择 .md 文件
2. 或直接将 Markdown 文件拖拽到页面任意位置
3. 系统自动加载文件内容并显示

**注意事项**：
- 仅支持 .md 和 .markdown 文件
- 文件大小限制为 10MB

### 7.3 目录导航

**功能说明**：自动解析 Markdown 标题生成目录，支持点击导航到对应章节。

**使用步骤**：
1. 确保目录侧边栏可见（点击顶部工具栏的「目录」按钮）
2. 点击目录中的标题项
3. 预览区自动平滑滚动到对应章节
4. 滚动预览区时，目录会自动高亮当前可见的标题

### 7.4 主题切换

**功能说明**：一键切换亮色/暗色主题，自动记忆用户偏好。

**使用步骤**：
1. 点击顶部工具栏的主题切换按钮（🌙/☀️）
2. 系统切换主题并保存偏好
3. 下次打开时自动恢复上次选择的主题

## 8. 配置、部署与开发

### 8.1 环境要求

- Node.js ≥ 18.x
- npm ≥ 9.x 或 pnpm ≥ 8.x

### 8.2 安装与运行

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

### 8.3 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录。

### 8.4 配置说明

#### markdown-it 自定义渲染

项目已配置以下增强：
- **标题锚点**：自动为 H1-H6 添加 `id` 属性，便于目录跳转
- **外链新窗口**：所有外部链接在「新标签页」打开
- **代码块高亮**：集成 highlight.js，支持语言自动检测

#### LaTeX 公式渲染

采用占位符法渲染公式：
1. 提取 $...$ 和 $$...$$ 公式
2. 用占位符替换公式内容
3. 解析 Markdown 为 HTML
4. 将占位符替换为 KaTeX 渲染的 HTML

#### 暗黑模式

主题状态通过 `localStorage` 持久化，首次访问时自动检测系统偏好。

## 9. 监控与维护

### 9.1 错误处理

- **文件读取错误**：显示错误提示，3秒后自动清除
- **Markdown 解析错误**：显示错误信息，不影响应用运行
- **KaTeX 渲染错误**：在控制台显示警告，不影响其他内容渲染

### 9.2 性能优化

- **防抖处理**：拖拽事件使用定时器防止频繁触发
- **懒加载**：仅在需要时初始化 IntersectionObserver
- **高效渲染**：使用 Vue 3 的响应式系统和 computed 属性

### 9.3 安全注意事项

- **XSS 防护**：使用 DOMPurify 净化 HTML
- **文件验证**：限制文件类型和大小
- **KaTeX 信任设置**：当前设置为 `trust: true`，生产环境建议设为 `false`

## 10. 总结与亮点回顾

MD Reader Vue 是一个功能完整、用户友好的 Markdown 阅读器，具有以下亮点：

1. **优雅的用户界面**：采用现代化设计，支持亮色/暗色主题，响应式布局适配各种设备

2. **强大的 Markdown 功能**：
   - 实时预览
   - 代码高亮支持 190+ 编程语言
   - LaTeX 数学公式渲染
   - 自动生成目录导航

3. **优秀的用户体验**：
   - 支持文件拖拽上传
   - 分屏模式可调整比例
   - 平滑滚动导航
   - 光标位置显示
   - 实时字数统计

4. **技术实现亮点**：
   - 使用 Vue 3 Composition API 和 `<script setup>`
   - 采用 composables 封装业务逻辑，代码结构清晰
   - 公式渲染使用占位符法，提高可靠性
   - 主题状态持久化，支持系统偏好检测
   - 完善的错误处理和用户反馈

5. **可扩展性**：
   - 模块化设计，易于添加新功能
   - 良好的代码组织和注释
   - 依赖管理清晰，易于维护

MD Reader Vue 不仅是一个实用的 Markdown 阅读工具，也是学习 Vue 3 Composition API 和现代前端开发的优秀示例。