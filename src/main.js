import { createApp } from 'vue'
import './style.css'

// KaTeX 官方 CSS（公式渲染必需）
import 'katex/dist/katex.min.css'

// highlight.js 的 GitHub 亮色主题（暗色模式下会被 CSS 覆盖）
import 'highlight.js/styles/github.css'

import App from './App.vue'

createApp(App).mount('#app')
