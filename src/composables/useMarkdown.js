/**
 * useMarkdown.js
 * Composable：封装 markdown-it 14.x + highlight.js 解析逻辑
 *
 * 【公式渲染流程 - 两阶段架构】
 *
 *   Stage 1: Markdown 解析（当前文件）
 *   ┌──────────────────────────┐
 *   │  markdown-it 解析        │ ← $...$ 和 $$...$$ 作为普通文本通过
 *   │  Markdown → HTML         │   （不被识别为公式，保持为源码）
 *   └──────────┬───────────────┘
 *              │ 输出 HTML（含 "$E = mc^2$" 文本）
 *              ▼
 *   Stage 2: 公式渲染（MarkdownViewer.vue）
 *   ┌──────────────────────────┐
 *   │  v-html 渲染 HTML        │
 *   └──────────┬───────────────┘
 *              │ DOM 节点（含 "$...$" 文本）
 *              ▼
 *   ┌──────────────────────────┐
 *   │  auto-render (KaTeX)    │ ← 扫描文本节点，检测 $...$ / $$...$$
 *   │  替换为 KaTeX HTML      │   调用 katex.renderToString() 渲染
 *   └──────────┬───────────────┘
 *              │ 公式 HTML
 *              ▼
 *   浏览器 + KaTeX CSS → 渲染公式
 *
 * 为什么不用 markdown-it-katex？
 *   因为 markdown-it-katex 2.0.x 与 markdown-it 14.x 不兼容，
 *   插件的 block/inline 规则未正确注册，导致公式完全无法识别。
 *
 * 替代方案：auto-render
 *   这是 KaTeX 官方的 DOM 扫描渲染工具，与任何 Markdown 解析器无关，
 *   只负责在已渲染的 DOM 中找公式分隔符并替换为 HTML。
 */

import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import DOMPurify from 'isomorphic-dompurify'

// ============================================================
// 初始化 markdown-it 实例
// ============================================================
const md = new MarkdownIt({
  html: true,         // 允许 HTML 标签
  linkify: true,     // 自动识别链接
  typographer: true,  // 智能标点转换
  breaks: true,       // 单回车转 <br>
  highlight: (str, lang) => {
    // ── 语法高亮 ──
    // highlight.js 扫描代码块中的语言标记，在渲染前替换语言。
    // 注意：代码块内的 $ 符号是纯文本，不会被公式引擎处理。
    const langLabel = lang
      ? `<span class="absolute top-3 right-4 text-xs font-mono opacity-50 uppercase tracking-wider select-none">${lang}</span>`
      : ''
    let highlighted
    try {
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      } else {
        highlighted = hljs.highlightAuto(str).value
      }
    } catch {
      highlighted = str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    }
    return `<div class="relative">
  ${langLabel}
  <pre class="!mt-0 !bg-slate-900/80 !rounded-xl !p-0 !overflow-visible"><code class="hljs ${lang ? `language-${lang}` : ''}">${highlighted}</code></pre>
</div>`
  },
})

// ============================================================
// DOMPurify 配置（XSS 防护）
//
// 【安全说明】
//   markdown-it 的 html: true 允许用户编写原始 HTML。
//   v-html 会原样渲染这些 HTML，因此必须净化。
// ============================================================
const DOMPURIFY_CONFIG = {
  ADD_TAGS: ['span', 'div'],
  ADD_ATTR: ['class', 'id', 'target', 'rel', 'style'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z\n]|$))/gi,
}

const sanitize = (dirty) => DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG)

// ============================================================
// 工具函数
// ============================================================

/**
 * 生成标题锚点 id
 */
function makeAnchor(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[*_`[\]()>#~]/g, '')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
}

// ============================================================
// 自定义渲染规则
// ============================================================

/**
 * 标题渲染：为 H1-H6 添加 id 锚点，便于目录跳转
 */
md.renderer.rules.heading_open = (tokens, idx, _options, _env, self) => {
  const token = tokens[idx]
  const nextToken = tokens[idx + 1]
  const text = nextToken && nextToken.content ? nextToken.content : ''
  const anchor = makeAnchor(text)
  token.attrSet('id', anchor)
  return self.renderToken(tokens, idx, _options)
}

/**
 * 链接渲染：外部链接在新标签页打开
 */
const defaultLinkRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet('href')
  if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
    tokens[idx].attrPush(['target', '_blank'])
    tokens[idx].attrPush(['rel', 'noopener noreferrer'])
  }
  return defaultLinkRender(tokens, idx, options, env, self)
}

// ============================================================
// Composable
// ============================================================
export function useMarkdown() {
  /**
   * Markdown → 安全 HTML
   *
   * 【关键】LaTeX 公式分隔符（$...$ / $$...$$）会原样保留在 HTML 中，
   * 作为普通文本节点。后续由 MarkdownViewer.vue 中的 auto-render 处理。
   *
   * @param {string} markdownText 原始 Markdown（含 LaTeX 公式）
   * @returns {string} 安全的 HTML 字符串
   */
  const parseMarkdown = (markdownText) => {
    if (!markdownText) return ''

    try {
      // Step 1: markdown-it 渲染 Markdown → HTML
      //   注意：LaTeX 公式（$...$ / $$...$$）不会被解析，会原样出现在 HTML 中
      //   示例：输入 "$E = mc^2$" → 输出 "<p>$E = mc^2$</p>"
      const rawHtml = md.render(markdownText)

      // Step 2: DOMPurify 净化 HTML（XSS 防护）
      return sanitize(rawHtml)
    } catch (err) {
      console.error('[useMarkdown] 解析失败:', err)
      return `<p style="color:#ef4444">解析失败: ${err.message}</p>`
    }
  }

  /**
   * 从 Markdown 提取标题目录
   *
   * @param {string} markdownText
   * @returns {Array<{ level: number, text: string, anchor: string, id: string }>}
   */
  const extractToc = (markdownText) => {
    if (!markdownText) return []
    const headings = []
    try {
      const env = {}
      const tokens = md.parse(markdownText, env)
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === 'heading_open') {
          const depth = parseInt(tokens[i].tag.slice(1))
          const inlineToken = tokens[i + 1]
          if (inlineToken && inlineToken.type === 'inline') {
            const text = (inlineToken.children || [])
              .map(c => c.content)
              .join('')
            if (text) {
              const anchor = makeAnchor(text)
              headings.push({
                level: depth,
                text,
                anchor,
                id: `toc-${anchor}-${headings.length}`,
              })
            }
          }
        }
      }
    } catch (err) {
      console.warn('[useMarkdown] 目录提取失败:', err)
    }
    return headings
  }

  return { parseMarkdown, extractToc }
}
