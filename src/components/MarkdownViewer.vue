<template>
  <!--
    MarkdownViewer 组件
    负责渲染 Markdown HTML

    【渲染链路 - 简化版】
      useMarkdown.parseMarkdown()
         │
         ▼
      marked + marked-katex-extension 渲染
         │ → Markdown → HTML + KaTeX HTML（公式已直接渲染）
         ▼
      DOMPurify 净化（XSS 防护）
         │
         ▼
      v-html="sanitizedContent" → 浏览器直接渲染
         │
         ▼
      KaTeX CSS → 显示公式
  -->
  <div ref="viewerRef" class="markdown-body" v-html="sanitizedContent" />
</template>

<script setup>
/**
 * MarkdownViewer 组件
 *
 * Props:
 *   - content: marked + marked-katex-extension + DOMPurify 渲染后的 HTML 字符串
 *
 * 核心职责：
 *   直接渲染 HTML（KaTeX 公式已在 useMarkdown 阶段完成渲染）
 */
import { computed, ref } from 'vue'
import DOMPurify from 'isomorphic-dompurify'

const props = defineProps({
  /**
   * 已解析的 HTML 内容字符串
   * 由 useMarkdown.parseMarkdown() 生成（已含 KaTeX HTML + DOMPurify 净化）
   */
  content: { type: String, default: '' },
})

const viewerRef = ref(null)

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
</script>

<style scoped>
/**
 * KaTeX 块级公式样式（防止溢出）
 */
:deep(.katex-display) {
  display: block;
  margin: 1em 0;
  padding: 0.5em;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  text-align: center;
}

/**
 * KaTeX 行内公式样式微调
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
 * 长公式支持横向滚动
 */
:deep(.katex-display > .katex) {
  white-space: nowrap;
}
</style>
