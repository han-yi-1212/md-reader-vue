/**
 * useMarkdown.js
 * Composable：封装 markdown-it 14.x + markdown-it-katex + highlight.js 解析逻辑
 *
 * 技术选型说明：
 * - markdown-it: 主流 Markdown 解析器，插件生态丰富
 * - markdown-it-katex: KaTeX 官方插件，支持 $...$ 和 $$...$$ 语法
 * - KaTeX: 比 MathJax 渲染速度更快，适合前端阅读场景
 *
 * 注意事项：
 * - markdown-it-katex 使用 `fence` 规则排除代码块，代码中的 $ 符号不会误判为公式
 * - throwOnError: false 确保无效 LaTeX 不会崩溃，而是显示错误样式
 */

import MarkdownIt from 'markdown-it'
import mk from 'markdown-it-katex'
import hljs from 'highlight.js'

// ============================================================
// 初始化 markdown-it 实例
// ============================================================
const md = new MarkdownIt({
  html: true,         // 允许 HTML 标签
  linkify: true,     // 自动识别链接
  typographer: true, // 智能标点转换
  breaks: true,      // 单回车转 <br>
  highlight: (str, lang) => {
    // highlight.js 语法高亮
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
// KaTeX 选项：
//   - throwOnError: false → 无效 LaTeX 显示错误样式而非崩溃
//   - errorColor: 自定义错误颜色（配合 Tailwind 的 text-red-500）
//   - trust: true → 允许所有 KaTeX 命令（注意安全，生产环境可设为 false）
// ============================================================
md.use(mk, {
  throwOnError: false,
  errorColor: '#ef4444',
  trust: true,
  // 指定 LaTeX 定界符：支持 $$...$$、$...$、\[...\]、\(...\)
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
  ],
})

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
 * 使用 renderer.rules.heading_open 扩展（markdown-it 标准扩展方式）
 */
md.renderer.rules.heading_open = (tokens, idx, _options, _env, self) => {
  const token = tokens[idx]
  // 找到对应的 inline token 获取标题纯文本
  const nextToken = tokens[idx + 1]
  const text = nextToken && nextToken.content ? nextToken.content : ''
  const anchor = makeAnchor(text)
  // 直接修改 token 属性，markdown-it 自动渲染到 HTML
  token.attrSet('id', anchor)
  // 委托给默认渲染器输出 <hN id="...">
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
   * Markdown → HTML（含 KaTeX 公式渲染）
   * @param {string} markdownText
   */
  const parseMarkdown = (markdownText) => {
    if (!markdownText) return ''
    try {
      return md.render(markdownText)
    } catch (err) {
      console.error('[useMarkdown] 解析失败:', err)
      return `<p style="color:#ef4444">解析失败: ${err.message}</p>`
    }
  }

  /**
   * 从 Markdown 提取标题目录（用于侧边栏）
   * @param {string} markdownText
   * @returns {Array<{ level: number, text: string, anchor: string, id: string }>}
   */
  const extractToc = (markdownText) => {
    if (!markdownText) return []
    const headings = []
    try {
      const env = {}
      // 解析获取 token 列表，提取 heading 节点
      const tokens = md.parse(markdownText, env)
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === 'heading_open') {
          const depth = parseInt(tokens[i].tag.slice(1))
          // 下一个 token 是 inline 类型，包含标题文本
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
