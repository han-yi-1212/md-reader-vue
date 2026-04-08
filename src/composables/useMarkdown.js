/**
 * useMarkdown.js
 * Composable：封装 marked 18.x + KaTeX 直接渲染 + highlight.js 解析逻辑
 *
 * 【公式渲染流程 - 占位符法】
 *
 *   Stage 1: 公式提取与占位符保护
 *   ┌──────────────────────────┐
 *   │  提取 $...$ 和 $$...$$   │ ← 用唯一占位符替换公式
 *   └──────────┬───────────────┘
 *              │
 *              ▼
 *   Stage 2: marked 解析 Markdown
 *   ┌──────────────────────────┐
 *   │  Markdown → HTML         │ ← 公式被保护，不会被 Markdown 解析
 *   └──────────┬───────────────┘
 *              │
 *              ▼
 *   Stage 3: 公式恢复与 KaTeX 渲染
 *   ┌──────────────────────────┐
 *   │  占位符 → KaTeX HTML    │ ← 直接调用 katex.renderToString()
 *   └──────────┬───────────────┘
 *              │
 *              ▼
 *   Stage 4: DOMPurify 净化
 *   ┌──────────────────────────┐
 *   │  XSS 防护               │
 *   └──────────┬───────────────┘
 *              │
 *              ▼
 *   v-html → 浏览器渲染
 *
 * 为什么用占位符法？
 *   1. marked-katex-extension 在多个 $...$ 时边界检测有问题
 *   2. 占位符法完全不依赖 marked 的公式处理
 *   3. 直接调用 katex.renderToString() 更可靠
 */

import { marked } from 'marked'
import katex from 'katex'
import hljs from 'highlight.js'
import DOMPurify from 'isomorphic-dompurify'

// ============================================================
// 初始化 marked 实例（不包含 KaTeX 插件）
// ============================================================

// 配置 marked
marked.use({
  // 语法高亮
  highlight: (str, lang) => {
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
//   marked 的 html: true 允许用户编写原始 HTML。
//   v-html 会原样渲染这些 HTML，因此必须净化。
// ============================================================
const DOMPURIFY_CONFIG = {
  ADD_TAGS: ['span', 'div'],
  ADD_ATTR: ['class', 'id', 'target', 'rel', 'style'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z\n]|$))/gi,
}

const sanitize = (dirty) => DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG)

// ============================================================
// KaTeX 配置
// ============================================================
const KATEX_OPTIONS = {
  throwOnError: false,   // 无效 LaTeX 优雅降级，不崩溃
  errorColor: '#ef4444', // 错误时显示红色
  strict: false,         // 允许所有 KaTeX 命令
  trust: true,           // ⚠️ 生产环境建议设为 false
  displayMode: false,    // 默认行内模式
}

// ============================================================
// 公式处理：占位符法
// ============================================================

let placeholderCounter = 0

/**
 * 生成唯一的占位符
 */
function makePlaceholder() {
  return `\x00KATEX_PLACEHOLDER_${++placeholderCounter}\x00`
}

/**
 * 提取并渲染所有公式（$...$ 和 $$...$$）
 * 
 * 【占位符法原理】
 *   1. 匹配所有 $...$ 和 $$...$$
 *   2. 用唯一占位符替换公式内容
 *   3. 让 marked 处理剩余的 Markdown（公式被保护）
 *   4. 将占位符替换为已渲染的 KaTeX HTML
 * 
 * @param {string} text 原始 Markdown 文本
 * @returns {{ text: string, formulas: Map<string, { latex: string, html: string }> }}
 */
function extractAndRenderFormulas(text) {
  if (!text) return { text: '', formulas: new Map() }

  const formulas = new Map()
  let result = text
  let counter = 0

  // 匹配公式：块级 $$...$$ 和 行内 $...$
  // 使用 [\s\S]*? 非贪婪匹配，正确处理多行公式
  // 负向前瞻 (?!\$) 确保不匹配 $$ 后紧跟 $ 的情况
  const formulaPattern = /(\$\$[\s\S]*?\$\$)|(\$(?!\$)(?:[^\$\\]|(?:\\.)|(?:\{[^}]*\}))*?\$)/g

  // 按出现顺序处理，从后往前替换（保持位置正确）
  const matches = []
  let match

  while ((match = formulaPattern.exec(text)) !== null) {
    matches.push({
      fullMatch: match[0],
      index: match.index,
      length: match[0].length,
      isBlock: match[0].startsWith('$$'),
    })
  }

  // 从后往前替换
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i]
    const latex = m.fullMatch.slice(m.isBlock ? 2 : 1, m.isBlock ? -2 : -1)

    // 预处理：折叠公式内的换行符为空格
    const processedLatex = latex.replace(/\r?\n/g, ' ')

    // 渲染为 KaTeX HTML
    try {
      const html = katex.renderToString(processedLatex, {
        ...KATEX_OPTIONS,
        displayMode: m.isBlock,
      })

      const placeholder = `\x00KATEX_PH_${++counter}\x00`
      const before = result.slice(0, m.index)
      const after = result.slice(m.index + m.length)
      result = before + placeholder + after

      formulas.set(placeholder, html)
    } catch (err) {
      console.warn('[KaTeX] 渲染失败:', err.message, '公式:', processedLatex.slice(0, 50))
    }
  }

  return { text: result, formulas }
}

/**
 * 恢复公式（将占位符替换为 KaTeX HTML）
 */
function restoreFormulas(html, formulas) {
  if (!formulas || formulas.size === 0) return html

  let result = html
  for (const [placeholder, katexHtml] of formulas) {
    result = result.split(placeholder).join(katexHtml)
  }

  return result
}

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
// Composable
// ============================================================
export function useMarkdown() {
  /**
   * Markdown → 安全 HTML
   *
   * 【关键】LaTeX 公式在 marked 解析阶段直接转换为 KaTeX HTML，
   * 不再需要后续的 auto-render 处理。
   *
   * @param {string} markdownText 原始 Markdown（含 LaTeX 公式）
   * @returns {string} 安全的 HTML 字符串
   */
  const parseMarkdown = (markdownText) => {
    if (!markdownText) return ''

    try {
      // Step 1: 提取并渲染公式
      //   - 匹配所有 $...$ 和 $$...$$
      //   - 直接用 katex.renderToString() 渲染
      //   - 用占位符替换公式，保护它们不被 Markdown 处理
      const { text: protectedText, formulas } = extractAndRenderFormulas(markdownText)

      // Step 2: marked 解析 Markdown
      //   公式已被占位符保护，不会被 Markdown 解析器干扰
      const rawHtml = marked.parse(protectedText)

      // Step 3: 恢复公式
      //   将占位符替换为 KaTeX HTML
      const htmlWithFormulas = restoreFormulas(rawHtml, formulas)

      // Step 4: DOMPurify 净化 HTML（XSS 防护）
      return sanitize(htmlWithFormulas)
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
      // marked 18.x 使用 Tokens API
      const tokens = marked.lexer(markdownText)
      for (const token of tokens) {
        if (token.type === 'heading') {
          const text = token.text
          if (text) {
            const anchor = makeAnchor(text)
            headings.push({
              level: token.depth,
              text,
              anchor,
              id: `toc-${anchor}-${headings.length}`,
            })
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
