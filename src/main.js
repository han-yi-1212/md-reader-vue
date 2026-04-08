import { createApp } from 'vue'
import './style.css'
// 引入 highlight.js 的主题样式（会被暗色主题覆盖）
import 'highlight.js/styles/github.css'
import App from './App.vue'

createApp(App).mount('#app')
