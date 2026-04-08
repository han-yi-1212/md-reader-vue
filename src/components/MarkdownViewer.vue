<template>
  <!--
    MarkdownViewer 组件
    负责渲染已解析的 Markdown HTML，同时处理 KaTeX 公式样式优化

    【渲染链路】
      useMarkdown.parseMarkdown() 输入 Markdown
         │
         ▼
      markdown-it + katex 插件生成 HTML（含 .katex 类名）
         │
         ▼
      DOMPurify.sanitize() 净化 HTML
         │
         ▼
      v-html="content" 渲染到 DOM ← 当前组件这一步
         │
         ▼
      浏览器读取 KaTeX CSS → 公式渲染完成
  -->
  <div class="markdown-body" v-html="sanitizedContent" />
</template>

<script setup>
/**
 * MarkdownViewer 组件
 *
 * Props:
 *   - content: markdown-it 解析后的 HTML 字符串
 *              （已含 KaTeX 公式 HTML + DOMPurify 净化后）
 *
 * 【为什么不需要 renderMathInElement？】
 *
 *   很多教程会建议在 v-html 后用 renderMathInElement() 扫描 DOM 并渲染公式。
 *   但我们的架构不需要这么做：
 *
 *   renderMathInElement 适用于「公式文本直接写在 HTML 里」的场景（如 VuePress 插件），
 *   它会：遍历文本节点 → 检测 $...$ → 调用 KaTeX → 替换为 HTML。
 *
 *   我们的架构中：
 *   markdown-it-katex 已经在 md.render() 阶段完成了公式→HTML 的转换，
 *   输出的 HTML 已经包含 <span class="katex">...</span>，浏览器加载
 *   katex.min.css 后自动渲染，无需二次扫描。
 *
 *   这也是为什么 KaTeX CSS 必须在 main.js 中引入 —— CSS 负责最终渲染。
 */
import { computed } from 'vue'
import DOMPurify from 'isomorphic-dompurify'

const props = defineProps({
  /**
   * 已解析的 HTML 内容字符串
   * 由 useMarkdown.parseMarkdown() 生成（已含 KaTeX HTML + DOMPurify 净化）
   */
  content: { type: String, default: '' },
})

/**
 * 安全内容计算属性
 *
 * 【防御性编程】
 *   虽然 useMarkdown.parseMarkdown() 已经调用了 DOMPurify.sanitize()，
 *   这里再做一次净化作为纵深防御（defense in depth）。
 *   即使 props.content 来源被绕过，也能兜底保护。
 */
const sanitizedContent = computed(() => {
  if (!props.content) return ''
  // 保留 KaTeX 需要的 class 属性，其他危险内容全部过滤
  return DOMPurify.sanitize(props.content, {
    ADD_TAGS: ['span', 'div'],
    ADD_ATTR: ['class', 'id', 'target', 'rel', 'style'],
  })
})
</script>

<style scoped>
/**
 * KaTeX 行内公式样式
 * 当浏览器加载 katex/dist/katex.min.css 后，
 * 所有 class="katex" 的元素会自动获得字体和颜色
 */
:deep(.katex) {
  font-size: 1em;
}

/**
 * KaTeX 块级公式（$$...$$）样式
 * 这类公式在 HTML 中是 <div class="katex-display"> 包裹
 * 样式在 style.css 的全局 .katex-display 中定义
 * 此处 scoped 样式确保行内公式（.katex）颜色与正文协调
 */
:deep(.dark .katex-display) {
  color: inherit;
}

/**
 * 代码块中的 KaTeX 排除
 *
 * markdown-it-katex 使用 fence 规则，不处理代码块内的 $ 符号。
 * 这里双重保险：即使有误判，也确保代码块中不显示 KaTeX 样式。
 */
:deep(pre code .katex),
:deep(code .katex) {
  color: inherit;
  background: transparent;
  padding: 0;
}
</style>
