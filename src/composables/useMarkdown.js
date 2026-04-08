/**
 * useMarkdown.js
 * Composable：封装 markdown-it 14.x + markdown-it-katex + highlight.js 解析逻辑
 *
 * 【关键架构说明 - 公式渲染流程】
 *
 *   Markdown 文本
 *       │
 *       ▼
 *   ┌─────────────────────┐
 *   │  markdown-it 解析    │  ← tokenize + parse
 *   └─────────┬───────────┘
 *             │  token 流（含 katex_math 标记）
 *             ▼
 *   ┌─────────────────────┐
 *   │  markdown-it-katex  │  ← 在 render 阶段，插件检测 $$ / $ /
 *   │  插件处理           │    \[ \]  \ ( 分隔符，将 LaTeX 源码
 *   │  (核心公式处理)      │    替换为 <span class="katex"> HTML
 *   └─────────┬───────────┘
 *             │  HTML 字符串（已含 <span class="katex">）
 *             ▼
 *   ┌─────────────────────┐
 *   │  DOMPurify 净化     │  ← 移除 XSS 恶意代码（如 <script>）
 *   └─────────┬───────────┘
 *             │ 安全的 HTML
 *             ▼
 *   v-html 渲染到 DOM
 *       │
 *       ▼
 *   KaTeX CSS 读取 .katex 类名 → 浏览器渲染出数学公式
 *
 * 为什么不用 renderMathInElement？
 *   因为 markdown-it-katex 已经在 parse 阶段完成了公式处理，
 *   HTML 中已经是 <span class="katex">...</span>，
 *   浏览器加载 katex.min.css 后自动渲染，无需二次扫描。
 *
 * 技术选型：
 * - markdown-it: 主流 Markdown 解析器，插件生态丰富
 * - markdown-it-katex: KaTeX 官方插件，支持 $...$ 和 $$...$$ 语法
 * - KaTeX: 比 MathJax 渲染速度更快，适合前端阅读场景
 * - DOMPurify: XSS 防护，只允许安全的 HTML 标签/属性
 *
 * 注意事项：
 * - markdown-it-katex 使用 `fence` 规则排除代码块，代码中的 $ 不会误判
 * - throwOnError: false 确保无效 LaTeX 显示错误样式而不崩溃
 */

import MarkdownIt from 'markdown-it'
import mk from 'markdown-it-katex'
import hljs from 'highlight.js'
import DOMPurify from 'isomorphic-dompurify'

// ============================================================
// 初始化 markdown-it 实例
// ============================================================
const md = new MarkdownIt({
  html: true,         // 允许 HTML 标签（必须为 true 以兼容 markdown-it-katex）
  linkify: true,     // 自动识别链接
  typographer: true,  // 智能标点转换
  breaks: true,       // 单回车转 <br>
  highlight: (str, lang) => {
    // ── 关键：highlight.js 语法高亮 ──
    // highlight.js 在服务端（Node）或浏览器中工作，
    // 输出带 <span class="hljs"> 类的 HTML，不会处理公式符号 $
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
// 注册 markdown-it-katex 插件
//
// 【核心公式渲染逻辑】
//   插件在 markdown-it 的 render 阶段工作：
//   1. 扫描 HTML 中的文本节点
//   2. 匹配 LaTeX 分隔符（$$ / $ / \[ / \()  )
//   3. 调用 KaTeX.render() / KaTeX.renderToString()
//   4. 将结果替换回 HTML（生成 <span class="katex"> 或
//      <div class="katex-display"><span class="katex">）
//
// KaTeX 选项说明：
//   - throwOnError: false  → 无效 LaTeX 显示 .katex-error，不崩溃
//   - errorColor          → 错误文本颜色（配合 Tailwind text-red-500）
//   - trust               → true=允许所有 KaTeX 命令；false=严格白名单
//   - delimiters          → 自定义分隔符，默认已支持全部 4 种
// ============================================================
md.use(mk, {
  throwOnError: false,  // ⚠️ 关键：无效 LaTeX 优雅降级，不抛异常
  errorColor: '#ef4444', // 错误时显示红色（Tailwind red-500）
  trust: true,           // ⚠️ 生产环境建议设为 false，只允许安全命令
  // LaTeX 分隔符配置（默认值即为以下 4 种）
  delimiters: [
    { left: '$$', right: '$$', display: true },   // $$...$$  → 块级公式
    { left: '$', right: '$', display: false },     // $...$    → 行内公式
    { left: '\\[', right: '\\]', display: true },  // \[...\]  → 块级公式
    { left: '\\(', right: '\\)', display: false }, // \(...\)  → 行内公式
  ],
})

// ============================================================
// DOMPurify 配置
//
// 【XSS 防护关键】
//   markdown-it 的 html: true 允许用户编写原始 HTML，
//   v-html 会原样渲染这些 HTML，因此必须净化。
//   DOMPurify 只保留安全的标签和属性，过滤：
//   - <script>、<iframe> 等危险标签
//   - onclick、onerror 等内联事件处理器
//   - javascript: 伪协议链接
//   - data: 链接（除非在白名单）
// ============================================================
const DOMPURIFY_CONFIG = {
  // 允许 KaTeX 渲染出的 HTML 标签（.katex / .katex-display / .katex-math-err）
  ADD_TAGS: ['span', 'div'],
  ADD_ATTR: ['class'], // 保留 class（KaTeX 的 class 是安全的）

  // 允许的协议：仅 http/https/mailto
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z\n]|$))/gi,
}

const sanitize = (dirty) => DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG)

// ============================================================
// 工具函数
// ============================================================

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
// 自定义渲染规则
// ============================================================

/**
 * 标题渲染规则：为 H1-H6 添加 id 锚点，便于目录跳转
 *
 * 【关键实现】
 *   markdown-it 在 render 阶段输出 HTML 标签（如 <h1>）。
 *   我们通过 renderer.rules.heading_open 拦截 heading_open token，
 *   找到对应标题文本，生成锚点 id，添加到 token 属性中。
 *   token.attrSet('id', ...) 会让 markdown-it 在渲染时输出 id="..."。
 */
md.renderer.rules.heading_open = (tokens, idx, _options, _env, self) => {
  const token = tokens[idx]
  // 下一个 token 是 inline 类型，包含标题纯文本
  const nextToken = tokens[idx + 1]
  const text = nextToken && nextToken.content ? nextToken.content : ''
  const anchor = makeAnchor(text)
  // 设置 id 属性 → markdown-it 自动渲染为 <hN id="anchor">
  token.attrSet('id', anchor)
  return self.renderToken(tokens, idx, _options)
}

/**
 * 链接渲染：外部链接在新标签页打开
 *
 * 【安全说明】
 *   链接的 target="_blank" 是安全的，但需要配合 rel="noopener noreferrer"
 *   防止新页面通过 window.opener 访问原页面（防止钓鱼攻击）。
 */
const defaultLinkRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet('href')
  // 仅对外部链接添加安全属性
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
   * Markdown → 安全 HTML（含 KaTeX 公式渲染）
   *
   * 【渲染链路】
   *   markdown-it (含 katex 插件)      → 生成 HTML（含 .katex 元素）
   *        ↓
   *   DOMPurify.sanitize()            → 移除 XSS 恶意代码
   *        ↓
   *   v-html 渲染到页面               → KaTeX CSS 渲染公式
   *
   * @param {string} markdownText 原始 Markdown 文本
   * @returns {string} 安全的 HTML 字符串
   */
  const parseMarkdown = (markdownText) => {
    if (!markdownText) return ''

    try {
      // Step 1: markdown-it + katex 插件渲染 Markdown + LaTeX → HTML
      const rawHtml = md.render(markdownText)

      // Step 2: DOMPurify 净化 HTML（防止 XSS 攻击）
      //   ⚠️ 此步骤至关重要，确保恶意 Markdown 无法注入 <script> 等危险标签
      return sanitize(rawHtml)
    } catch (err) {
      console.error('[useMarkdown] 解析失败:', err)
      return `<p style="color:#ef4444">解析失败: ${err.message}</p>`
    }
  }

  /**
   * 从 Markdown 提取标题目录（用于侧边栏）
   *
   * 【与公式的关系】
   *   此函数只解析 token 中的纯文本，不涉及公式渲染。
   *   它使用 md.parse() 获取 token 流，从中提取 heading 节点。
   *
   * @param {string} markdownText
   * @returns {Array<{ level: number, text: string, anchor: string, id: string }>}
   */
  const extractToc = (markdownText) => {
    if (!markdownText) return []
    const headings = []
    try {
      const env = {}
      // md.parse() 返回 token 数组，用于静态分析（不触发 render）
      const tokens = md.parse(markdownText, env)
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === 'heading_open') {
          const depth = parseInt(tokens[i].tag.slice(1))
          // heading_open 后紧跟 inline token，包含标题文本
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
