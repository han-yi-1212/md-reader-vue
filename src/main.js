import { createApp } from 'vue'
import './style.css'

// KaTeX 官方 CSS（auto-render 生成 .katex 元素后，浏览器靠此 CSS 渲染公式）
import 'katex/dist/katex.min.css'

// highlight.js 的 GitHub 亮色主题（暗色模式下被 CSS 覆盖）
import 'highlight.js/styles/github.css'

import App from './App.vue'

createApp(App).mount('#app')
