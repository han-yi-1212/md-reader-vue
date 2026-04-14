<template>
  <!--
    App.vue - 应用根组件
    负责组合所有子组件，管理全局状态
  -->
  <div
    class="flex flex-col h-screen overflow-hidden transition-theme
           bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
    @dragenter="handleGlobalDragEnter"
  >
    <!-- ============================
         顶部工具栏
         ============================ -->
    <AppHeader
      :fileName="fileName"
      :currentMode="viewMode"
      :isDark="isDark"
      :tocVisible="tocVisible"
      @mode-change="viewMode = $event"
      @toggle-theme="toggleTheme"
      @toggle-toc="tocVisible = !tocVisible"
      @file-select="handleFileSelect($event, setContent)"
    />

    <!-- 错误提示 Toast -->
    <Transition name="slide-down">
      <div
        v-if="fileError"
        class="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
               px-4 py-3 rounded-xl bg-red-500 text-white shadow-xl text-sm font-medium"
      >
        <AlertCircle :size="16" />
        {{ fileError }}
      </div>
    </Transition>

    <!-- ============================
         主体内容区
         ============================ -->
    <main class="flex flex-1 overflow-hidden">

      <!-- 目录侧边栏（条件显示） -->
      <Transition name="slide-in-left">
        <TocSidebar
          v-if="tocVisible"
          :headings="toc"
          :activeAnchor="activeAnchor"
          :wordCount="wordCount"
        />
      </Transition>

      <!-- 内容区：根据 viewMode 切换布局 -->
      <div class="flex flex-1 overflow-hidden">

        <!-- 编辑模式：仅显示编辑器 -->
        <template v-if="viewMode === 'edit'">
          <EditorPane
            v-model="markdownContent"
            class="flex-1 animate-fade-in"
          />
        </template>

        <!-- 预览模式：仅显示预览 -->
        <template v-else-if="viewMode === 'preview'">
          <PreviewPane
            :htmlContent="renderedHtml"
            class="flex-1 animate-fade-in"
            @heading-visible="activeAnchor = $event"
          />
        </template>

        <!-- 分屏模式：左编辑 + 右预览 -->
        <template v-else>
          <!-- 左：编辑器（可拖拽调整宽度） -->
          <EditorPane
            v-model="markdownContent"
            class="animate-fade-in border-r border-slate-200 dark:border-slate-700"
            :style="{ width: splitRatio + '%' }"
          />

          <!-- 分隔拖动条 -->
          <div
            class="w-1 cursor-col-resize hover:bg-indigo-400 dark:hover:bg-indigo-600
                   transition-colors duration-150 shrink-0 relative group"
            @mousedown="startResize"
          >
            <!-- 拖动提示图标 -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-4 h-8 rounded bg-slate-300 dark:bg-slate-600
                        flex items-center justify-center opacity-0 group-hover:opacity-100
                        transition-opacity duration-150">
              <GripVertical :size="12" class="text-slate-500 dark:text-slate-400" />
            </div>
          </div>

          <!-- 右：预览 -->
          <PreviewPane
            :htmlContent="renderedHtml"
            class="animate-fade-in"
            :style="{ width: (100 - splitRatio) + '%' }"
            @heading-visible="activeAnchor = $event"
          />
        </template>

      </div>
    </main>

    <!-- ============================
         全屏拖拽遮罩
         ============================ -->
    <DropZone
      :visible="isGlobalDragging"
      @drop="handleGlobalDrop"
      @leave="isGlobalDragging = false"
    />
  </div>
</template>

<script setup>
/**
 * App.vue
 * 应用根组件，整合所有子组件和 composable
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { AlertCircle, GripVertical } from 'lucide-vue-next'

// 子组件
import AppHeader from './components/AppHeader.vue'
import TocSidebar from './components/TocSidebar.vue'
import EditorPane from './components/EditorPane.vue'
import PreviewPane from './components/PreviewPane.vue'
import DropZone from './components/DropZone.vue'

// Composables
import { useMarkdown } from './composables/useMarkdown.js'
import { useTheme } from './composables/useTheme.js'
import { useFileHandler } from './composables/useFileHandler.js'

// ============================================================
// 主题管理
// ============================================================
const { isDark, toggleTheme, initTheme } = useTheme()

// ============================================================
// Markdown 解析
// ============================================================
const { parseMarkdown, extractToc } = useMarkdown()

// ============================================================
// 文件处理
// ============================================================
const { fileName, fileError, handleFileSelect, handleDrop } = useFileHandler()

// ============================================================
// 编辑器状态
// ============================================================

// Markdown 原始内容（双向绑定到编辑器）
const markdownContent = ref(getDefaultContent())

// 渲染后的 HTML（计算属性）
const renderedHtml = computed(() => parseMarkdown(markdownContent.value))

// 目录数据（计算属性）
const toc = computed(() => extractToc(markdownContent.value))

// 当前激活的锚点（由 PreviewPane 的 IntersectionObserver 更新）
const activeAnchor = ref('')

// 字数统计（去除 Markdown 标记后统计）
const wordCount = computed(() => {
  const text = markdownContent.value
    .replace(/```[\s\S]*?```/g, '')    // 移除代码块
    .replace(/`[^`]*`/g, '')           // 移除行内代码
    .replace(/[#*_>\-\[\]()!]/g, '')   // 移除 Markdown 标记
    .trim()
  // 中文按字符计，英文按单词计
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  return chineseChars + englishWords
})

// ============================================================
// 视图模式
// ============================================================
// 'edit' | 'split' | 'preview'
const viewMode = ref('split')
// 目录可见性
const tocVisible = ref(true)

// ============================================================
// 分屏拖动调整比例
// ============================================================
const splitRatio = ref(45) // 左侧占比 45%

let isResizing = false

const startResize = (e) => {
  isResizing = true
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  // 拖动时禁用文本选择
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}

const onResize = (e) => {
  if (!isResizing) return
  const container = document.querySelector('main .flex.flex-1.overflow-hidden')
  if (!container) return
  const rect = container.getBoundingClientRect()
  const newRatio = ((e.clientX - rect.left) / rect.width) * 100
  // 限制范围：20% ~ 80%
  splitRatio.value = Math.min(80, Math.max(20, newRatio))
}

const stopResize = () => {
  isResizing = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

// ============================================================
// 全局拖拽处理
// ============================================================
const isGlobalDragging = ref(false)
let dragLeaveTimer = null

/**
 * 监听整个应用的 dragenter 事件
 * 使用 timer 防止子元素切换时的闪烁
 */
const handleGlobalDragEnter = (e) => {
  e.preventDefault()
  clearTimeout(dragLeaveTimer)
  isGlobalDragging.value = true
}

const handleGlobalDrop = async (e) => {
  isGlobalDragging.value = false
  await handleDrop(e, setContent)
}

/**
 * 全局 dragleave 事件（挂载在 window 上）
 */
const handleWindowDragLeave = (e) => {
  // 离开窗口时隐藏遮罩
  if (e.clientX <= 0 || e.clientY <= 0 ||
      e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
    isGlobalDragging.value = false
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 设置编辑器内容（文件加载成功后调用）
 */
const setContent = (content) => {
  markdownContent.value = content
  // 有内容时切换到分屏模式
  if (viewMode.value === 'edit') viewMode.value = 'split'
}

/**
 * 返回默认的示例 Markdown 内容
 */
function getDefaultContent() {
  return `# 欢迎使用 MD Reader ✨

> 一款优雅的 Markdown 阅读器，支持实时预览、代码高亮、目录导航等功能。

## 功能介绍

### 📝 编辑 & 预览

在左侧输入 **Markdown** 内容，右侧实时渲染预览。支持三种视图模式：

- **编辑模式** — 专注写作
- **分屏模式** — 左写右看
- **预览模式** — 沉浸阅读

### 📂 文件上传

支持两种方式加载文件：

1. 点击顶部 **上传** 按钮选择 \`.md\` 文件
2. 直接将文件**拖拽**到页面任意位置

### 🎨 代码高亮

支持多种语言的语法高亮：

\`\`\`javascript
// JavaScript 示例
const greet = (name) => {
  return \`Hello, \${name}! 👋\`
}

console.log(greet('Markdown'))
\`\`\`

\`\`\`python
# Python 示例
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print([fibonacci(i) for i in range(10)])
\`\`\`

### 📊 表格支持

| 功能 | 支持状态 | 说明 |
|------|---------|------|
| 代码高亮 | ✅ | 基于 highlight.js |
| 目录导航 | ✅ | 自动解析标题 |
| 暗黑模式 | ✅ | 一键切换 |
| 文件拖拽 | ✅ | 拖入即加载 |
| 分屏编辑 | ✅ | 可调整比例 |
| LaTeX 公式 | ✅ | KaTeX 渲染 $...$ 和 $$...$$ |

### 🌙 暗黑模式

点击右上角 🌙 按钮即可切换亮色/暗色主题，主题偏好会自动保存。

---

## Markdown 语法示例

这是**粗体**，这是*斜体*，这是~~删除线~~，这是\`行内代码\`。

> 这是一段引用文字，可以用来强调重要信息。
> 
> 支持多行引用。

### 任务列表

- [x] 实现 Markdown 解析
- [x] 代码语法高亮
- [x] 目录自动生成
- [x] 暗黑模式
- [x] LaTeX 数学公式
- [ ] 更多功能待开发...

---

## 📐 LaTeX 数学公式

### 行内公式

质能守恒方程 $E = mc^2$，欧拉公式 $e^{i\\pi} + 1 = 0$。

行内积分示例：$\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)$

### 块级公式（居中显示）

勾股定理：

$$
a^2 + b^2 = c^2
$$

薛定谔方程：

$$
i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\left[-\\frac{\\hbar^2}{2m}\\nabla^2 + V(\\mathbf{r},t)\\right]\\Psi(\\mathbf{r},t)
$$

矩阵示例：

$$
\\mathbf{A} = \\begin{pmatrix}
a_{11} & a_{12} \\\\
a_{21} & a_{22}
\\end{pmatrix}
$$

### 反斜杠括号

使用 \( ... \) 行内公式：\( \\sum_{i=1}^{n} x_i \)

---

*开始你的写作之旅吧！ 🚀*
`
}

// ============================================================
// 生命周期
// ============================================================
onMounted(() => {
  initTheme()
  window.addEventListener('dragleave', handleWindowDragLeave)
})

onUnmounted(() => {
  window.removeEventListener('dragleave', handleWindowDragLeave)
  stopResize()
})
</script>

<style>
/* 目录侧边栏滑入动画 */
.slide-in-left-enter-active,
.slide-in-left-leave-active {
  transition: all 0.25s ease;
}
.slide-in-left-enter-from,
.slide-in-left-leave-to {
  opacity: 0;
  transform: translateX(-20px);
  width: 0 !important;
  min-width: 0 !important;
  overflow: hidden;
}

/* Toast 滑下动画 */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}
</style>
