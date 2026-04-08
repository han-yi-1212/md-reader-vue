<template>
  <!--
    MarkdownViewer 组件
    负责渲染 Markdown HTML 并处理 KaTeX 公式

    【完整渲染链路】
      useMarkdown.parseMarkdown()
         │
         ▼
      markdown-it 渲染 → HTML（含 "$E = mc^2$" 文本）
         │
         ▼
      DOMPurify 净化（XSS 防护）
         │
         ▼
      v-html="sanitizedContent" → 渲染 DOM（含 LaTeX 文本节点）
         │
         ▼
      autoRender(viewerRef.value, options) ← 核心公式处理
         │
         ▼
      KaTeX CSS 读取 .katex 类 → 浏览器渲染公式

    autoRender 工作原理：
      1. 遍历 DOM 中所有文本节点
      2. 用正则检测 LaTeX 分隔符（$$ / $ / \[ / \()  )
      3. 调用 katex.renderToString() 替换文本节点
      4. 生成 <span class="katex"> HTML
  -->
  <div ref="viewerRef" class="markdown-body" v-html="sanitizedContent" />
</template>

<script setup>
/**
 * MarkdownViewer 组件
 *
 * Props:
 *   - content: markdown-it + DOMPurify 渲染后的 HTML 字符串
 *              （LaTeX 分隔符 $...$ / $$...$$ 在 HTML 中作为普通文本存在）
 *
 * 核心职责：
 *   在 v-html 渲染 DOM 后，调用 auto-render 扫描文本节点，
 *   将 LaTeX 公式文本替换为 KaTeX HTML。
 */
import { computed, ref, watch, nextTick } from 'vue'
import DOMPurify from 'isomorphic-dompurify'

// ─────────────────────────────────────────────────────────────
// 【关键】auto-render 导入
//
// auto-render 是 KaTeX 官方的 DOM 扫描渲染工具（UMD 模块）。
// 它导出一个函数 renderMathInElement，等同于旧版 KaTeX 的 renderMathInElement。
// 导入方式兼容 Vite 打包环境。
// ─────────────────────────────────────────────────────────────
import autoRenderModule from 'katex/contrib/auto-render'

// autoRenderModule 可能是函数本身，也可能是 { default: fn } 对象
const autoRender = autoRenderModule.renderMathInElement || autoRenderModule.default || autoRenderModule

const props = defineProps({
  /**
   * 已解析的 HTML 内容字符串
   * 由 useMarkdown.parseMarkdown() 生成（已含 LaTeX 公式文本 + DOMPurify 净化）
   */
  content: { type: String, default: '' },
})

const viewerRef = ref(null)

// ─────────────────────────────────────────────────────────────
// 【核心公式渲染配置】
//
// auto-render 选项说明：
//   delimiters: 定义公式分隔符（和旧版 markdown-it-katex 兼容）
//     - { left: '$$', right: '$$', display: true }  → 块级公式（居中）
//     - { left: '$', right: '$', display: false }    → 行内公式
//     - { left: '\\[', right: '\\]', display: true } → 块级（LaTeX 风格）
//     - { left: '\\(', right: '\\)', display: false } → 行内（LaTeX 风格）
//
//   throwOnError: false → 无效 LaTeX 显示错误样式，不崩溃
//   strict: false → 宽松模式，允许所有命令
//   trust: true → 允许所有 KaTeX 命令（生产环境建议 false）
// ─────────────────────────────────────────────────────────────
const AUTORENDER_OPTIONS = {
  delimiters: [
    { left: '$$', right: '$$', display: true },   // 块级公式 $$...$$
    { left: '$', right: '$', display: false },     // 行内公式 $...$
    { left: '\\[', right: '\\]', display: true },  // 块级公式 \[...\]
    { left: '\\(', right: '\\)', display: false }, // 行内公式 \(...\)
  ],
  throwOnError: false,   // ⚠️ 关键：无效 LaTeX 优雅降级，不崩溃
  errorColor: '#ef4444', // 错误时显示红色
  strict: false,         // 允许所有 KaTeX 命令
  trust: true,           // ⚠️ 生产环境建议设为 false
  // 忽略代码块和 pre 标签内的内容（防止 $ 被误判为公式分隔符）
  ignoredTags: ['script', 'style', 'textarea', 'pre', 'code', 'kbd', 'samp'],
  // 忽略特定 class 的元素
  ignoredClasses: ['no-katex', 'math-disabled'],
}

/**
 * 安全内容计算属性
 *
 * 【XSS 纵深防御】
 *   useMarkdown.parseMarkdown() 已经调用了 DOMPurify.sanitize()。
 *   这里再做一次净化作为纵深防御。
 */
const sanitizedContent = computed(() => {
  if (!props.content) return ''
  return DOMPurify.sanitize(props.content, {
    ADD_TAGS: ['span', 'div'],
    ADD_ATTR: ['class', 'id', 'target', 'rel', 'style'],
  })
})

/**
 * 渲染后处理：调用 auto-render 扫描并渲染 LaTeX 公式
 *
 * 【关键执行时机】
 *   - immediate: true → 首次挂载时立即执行（处理初始内容）
 *   - watch(content) → 内容变化时重新渲染
 *   - nextTick() → 确保 v-html 的 DOM 已更新后再扫描
 */
watch(
  () => props.content,
  async () => {
    await nextTick()
    renderMath()
  },
  { immediate: true }
)

/**
 * 执行公式渲染
 *
 * auto-render 会遍历 DOM 文本节点，检测 LaTeX 分隔符，
 * 将公式源码替换为 <span class="katex-display"> 或 <span class="katex"> HTML。
 * 浏览器加载 katex.min.css 后自动渲染出数学公式。
 */
function renderMath() {
  if (!viewerRef.value) return
  if (!props.content) return

  try {
    autoRender(viewerRef.value, AUTORENDER_OPTIONS)
  } catch (err) {
    console.warn('[MarkdownViewer] 公式渲染失败:', err)
  }
}
</script>

<style scoped>
/**
 * KaTeX 行内公式样式微调
 * 当 auto-render 生成 <span class="katex"> 后，KaTeX CSS 负责字体和颜色
 * 这里做大小协调，确保与正文字体大小一致
 */
:deep(.katex) {
  font-size: 1em;
}

/**
 * 暗色模式下块级公式颜色协调
 */
:deep(.dark .katex-display) {
  color: inherit;
}

/**
 * 代码块中的 KaTeX 排除
 * ignoredTags 配置已经排除 pre/code，但双重保险
 */
:deep(pre code .katex),
:deep(code .katex) {
  color: inherit;
  background: transparent;
  padding: 0;
}
</style>
