<template>
  <!--
    MarkdownViewer 组件
    负责渲染已解析的 Markdown HTML，同时处理 KaTeX 公式的样式优化
    核心逻辑：
      1. v-html 渲染 markdown-it + markdown-it-katex 生成的 HTML
      2. KaTeX 公式样式通过全局 CSS 处理
      3. nextTick 后扫描 .katex-display 确保居中和间距正确
  -->
  <div ref="viewerRef" class="markdown-body" v-html="content" />
</template>

<script setup>
/**
 * MarkdownViewer 组件
 *
 * Props:
 *   - content: markdown-it 解析后的 HTML 字符串（已含 KaTeX 渲染结果）
 *
 * 工作原理：
 *   markdown-it + markdown-it-katex 在 useMarkdown.parseMarkdown() 中已经完成了
 *   所有的解析工作（Markdown → HTML + LaTeX → KaTeX HTML）。本组件只负责：
 *   1. v-html 渲染结果
 *   2. 渲染后做一些样式微调（如居中公式的 margin、代码块阴影等）
 *
 * 为什么不用 renderMathInElement：
 *   因为 markdown-it-katex 在解析阶段已经调用了 KaTeX，无需二次扫描。
 *   但在某些场景（如流式输出/nextTick 更新）下，如果需要额外处理，
 *   可以取消下方 nextTick 块的注释。
 */
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  /**
   * 已解析的 HTML 内容字符串
   * 由 useMarkdown().parseMarkdown() 生成
   */
  content: { type: String, default: '' },
})

const viewerRef = ref(null)

/**
 * 渲染后处理：优化 KaTeX 和代码块的样式
 * 在 nextTick 中执行，确保 DOM 已更新
 */
watch(
  () => props.content,
  async () => {
    await nextTick()
    applyStyles()
  },
  { immediate: true }
)

/**
 * 为特定元素应用样式微调
 */
function applyStyles() {
  if (!viewerRef.value) return

  // 确保块级公式（$$...$$）居中且有适当间距
  const displays = viewerRef.value.querySelectorAll('.katex-display')
  displays.forEach((el) => {
    el.classList.add('katex-display-wrapper')
    // 确保不超出容器
    el.style.overflowX = 'auto'
    el.style.overflowWrap = 'break-word'
  })

  // 为块级代码添加暗色主题背景（暗色模式下）
  const pres = viewerRef.value.querySelectorAll('pre')
  pres.forEach((el) => {
    // hljs 代码块已有暗色背景，这里确保圆角和阴影
    if (!el.classList.contains('hljs')) {
      el.classList.add('!bg-slate-900/80', '!rounded-xl')
    }
  })
}
</script>

<style scoped>
/**
 * KaTeX 行内公式样式微调
 * 确保在各种字体大小下都正常显示
 */
:deep(.katex) {
  font-size: 1em;
}

/**
 * KaTeX 块级公式样式微调
 * 在深色背景下适当调整颜色
 */
:deep(.dark .katex-display) {
  color: inherit;
}

/**
 * 代码块中的 KaTeX 排除处理
 * 注意：markdown-it-katex 使用 fence 规则不处理代码块
 * 这里双重保险，确保代码块内无 KaTeX 干扰
 */
:deep(pre code .katex),
:deep(code .katex) {
  color: inherit;
  background: transparent;
  padding: 0;
}
</style>
