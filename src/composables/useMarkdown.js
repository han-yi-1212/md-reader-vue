/**
 * useMarkdown.js
 * Composable：封装 marked v18 + highlight.js 解析逻辑
 *
 * marked v18 API 变更摘要：
 * - new Marked() + Marked.use({ renderer }) 替代 marked.setOptions()
 * - renderer 方法参数从 positional 改为对象解构
 * - heading: { tokens, depth } → 用 this.parser.parseInline(tokens) 渲染内联内容
 * - code:    { text, lang, escaped }
 * - link:    { href, title, tokens }
 */

import { Marked, lexer, Parser } from 'marked'
import hljs from 'highlight.js'

// ============================================================
// 实例化 Marked（v18 推荐方式）
// ============================================================
const markedInstance = new Marked({
  // gfm: true（默认），breaks: true（单回车转 <br>）
  breaks: true,
  gfm: true,
})

/**
 * 生成标题锚点 id
 * 规则：转小写 → 空格换连字符 → 移除 Markdown 标记和非法字符（保留中文）
 */
function makeAnchor(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    // 移除 Markdown 行内标记（**粗体**、*斜体*、`代码`、[链接](url)、>引用 等）
    .replace(/[*_`[\]()>#~]/g, '')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
}

// ============================================================
// 使用 Marked.use() 扩展渲染器（v18 推荐扩展方式）
// ============================================================
markedInstance.use({
  renderer: {
    /**
     * 标题渲染
     * @param {{ tokens: Array, depth: number }} token
     */
    heading(token) {
      const { tokens, depth } = token
      // 将内联 tokens 渲染为 HTML（保留粗体/斜体等格式）
      const text = this.parser.parseInline(tokens)
      const anchor = makeAnchor(text.replace(/<[^>]+>/g, ''))
      return `<h${depth} id="${anchor}" class="group">
  ${text}
  <a href="#${anchor}" class="anchor-link">#</a>
</h${depth}>\n`
    },

    /**
     * 代码块渲染（语法高亮）
     * @param {{ text: string, lang: string|undefined }} token
     */
    code(token) {
      const { text, lang } = token
      const validLang = lang && hljs.getLanguage(lang)
      const langLabel = lang
        ? `<span class="absolute top-3 right-4 text-xs font-mono opacity-50 uppercase tracking-wider select-none">${lang}</span>`
        : ''
      let highlighted
      try {
        highlighted = validLang
          ? hljs.highlight(text, { language: lang, ignoreIllegals: true }).value
          : hljs.highlightAuto(text).value
      } catch {
        highlighted = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
      }
      return `<div class="relative">
  ${langLabel}
  <pre><code class="hljs${validLang ? ` language-${lang}` : ''}">${highlighted}</code></pre>
</div>\n`
    },

    /**
     * 链接渲染：外部链接在新标签页打开
     * @param {{ href: string, title: string|null, tokens: Array }} token
     */
    link(token) {
      const { href, title, tokens } = token
      const text = this.parser.parseInline(tokens)
      const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'))
      const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''
      const titleAttr = title ? ` title="${title}"` : ''
      return `<a href="${href}"${titleAttr}${attrs}>${text}</a>`
    },
  },
})

// ============================================================
// Composable
// ============================================================
export function useMarkdown() {
  /**
   * Markdown → HTML
   * @param {string} markdownText
   */
  const parseMarkdown = (markdownText) => {
    if (!markdownText) return ''
    try {
      return markedInstance.parse(markdownText)
    } catch (err) {
      console.error('[useMarkdown] 解析失败:', err)
      return `<p style="color:#ef4444">解析失败: ${err.message}</p>`
    }
  }

  /**
   * 从 Markdown 提取标题目录
   * 使用 marked v18 独立的 lexer 函数
   * @param {string} markdownText
   * @returns {Array<{ level, text, anchor, id }>}
   */
  const extractToc = (markdownText) => {
    if (!markdownText) return []
    const headings = []
    const parser = new Parser()
    try {
      const tokens = lexer(markdownText)
      tokens.forEach((token) => {
        if (token.type === 'heading') {
          // 使用 Parser.parseInline 将内联 tokens 渲染为带格式的 HTML
          const renderedText = parser.parseInline(token.tokens)
          // 剥去 HTML 标签得到纯文本用于锚点和显示
          const cleanText = renderedText.replace(/<[^>]+>/g, '')
          headings.push({
            level: token.depth,
            text: cleanText,
            anchor: makeAnchor(cleanText),
            id: `toc-${makeAnchor(cleanText)}-${headings.length}`,
          })
        }
      })
    } catch (err) {
      console.warn('[useMarkdown] 目录提取失败:', err)
    }
    return headings
  }

  return { parseMarkdown, extractToc }
}
