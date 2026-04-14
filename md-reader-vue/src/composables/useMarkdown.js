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
  renderer: {
    code(token) {
      const { text: str, lang } = token
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
  },
})

// ============================================================
// DOMPurify 配置（XSS 防护）
//
// 【安全说明】
//   marked 的 html: true 允许用户编写原始 HTML。
//   v-html 会原样渲染这些 HTML，因此必须净化。
//   为了支持 KaTeX，需要允许 MathML 和 SVG 相关标签。
// ============================================================
const DOMPURIFY_CONFIG = {
  USE_PROFILES: { html: true, mathMl: true, svg: true },
  ADD_TAGS: [
    'span', 'div', 'annotation', 'semantics',
    'svg', 'path', 'rect', 'line', 'circle', 'ellipse', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'g', 'symbol', 'use'
  ],
  ADD_ATTR: [
    'class', 'id', 'target', 'rel', 'style', 'aria-hidden', 'display',
    'viewBox', 'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'points', 'transform'
  ],
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
 * 提取并渲染所有公式（$...$, $$...$$, \(...\), \[...\]）
 * 
 * 【占位符法原理】
 *   1. 识别代码块并暂时保护，防止其内部的 $ 或 \ 被错误识别为公式
 *   2. 匹配剩余文本中的 LaTeX 公式语法
 *   3. 用唯一占位符替换公式内容
 *   4. 让 marked 处理剩余的 Markdown（公式被保护）
 *   5. 将占位符替换为已渲染的 KaTeX HTML
 * 
 * @param {string} text 原始 Markdown 文本
 * @returns {{ text: string, formulas: Map<string, { latex: string, html: string }> }}
 */
function extractAndRenderFormulas(text) {
  if (!text) return { text: '', formulas: new Map() }

  const formulas = new Map()
  let counter = 0

  // 1. 保护代码块（包括行内代码和块级代码）
  // 匹配 ```...``` 和 `...`
  const codeBlocks = []
  let protectedText = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    const placeholder = `\x00CODE_PH_${codeBlocks.length}\x00`
    codeBlocks.push(match)
    return placeholder
  })

  // 2. 匹配公式：
  //   - $$...$$ (块级)
  //   - $...$ (行内)
  //   - \[...\] (块级)
  //   - \(...\) (行内)
  const formulaPattern = /(\$\$[\s\S]*?\$\$)|(\$(?!\$)(?:[^\$\\]|(?:\\.)|(?:\{[^}]*\}))*?\$)|(\\\[[\s\S]*?\\\])|(\\\([\s\S]*?\\\))/g

  protectedText = protectedText.replace(formulaPattern, (match) => {
    let isBlock = false
    let latex = ''

    if (match.startsWith('$$')) {
      isBlock = true
      latex = match.slice(2, -2)
    } else if (match.startsWith('$')) {
      isBlock = false
      latex = match.slice(1, -1)
    } else if (match.startsWith('\\[')) {
      isBlock = true
      latex = match.slice(2, -2)
    } else if (match.startsWith('\\(')) {
      isBlock = false
      latex = match.slice(2, -2)
    }

    // 预处理：折叠公式内的换行符为空格
    const processedLatex = latex.trim().replace(/\r?\n/g, ' ')

    // 渲染为 KaTeX HTML
    try {
      const html = katex.renderToString(processedLatex, {
        ...KATEX_OPTIONS,
        displayMode: isBlock,
      })

      const placeholder = `\x00KATEX_PH_${++counter}\x00`
      formulas.set(placeholder, html)
      return placeholder
    } catch (err) {
      console.warn('[KaTeX] 渲染失败:', err.message, '公式:', processedLatex.slice(0, 50))
      return match // 渲染失败则保留原始文本
    }
  })

  // 3. 还原代码块
  let finalPreParsedText = protectedText
  for (let i = 0; i < codeBlocks.length; i++) {
    finalPreParsedText = finalPreParsedText.split(`\x00CODE_PH_${i}\x00`).join(codeBlocks[i])
  }

  return { text: finalPreParsedText, formulas }
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
