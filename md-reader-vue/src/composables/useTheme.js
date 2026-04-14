/**
 * useTheme.js
 * Composable：管理亮色/暗色主题状态
 * - 持久化到 localStorage
 * - 支持系统偏好检测
 */

import { ref, watch, onMounted } from 'vue'

const THEME_KEY = 'md-reader-theme'

// 全局共享的主题状态（单例模式，跨组件共享）
const isDark = ref(false)

export function useTheme() {
  /**
   * 切换主题：更新 ref 值、DOM class 及 localStorage
   */
  const toggleTheme = () => {
    isDark.value = !isDark.value
  }

  /**
   * 设置指定主题
   * @param {boolean} dark - true 为暗色，false 为亮色
   */
  const setTheme = (dark) => {
    isDark.value = dark
  }

  /**
   * 监听 isDark 变化，同步到 DOM 和 localStorage
   */
  watch(isDark, (newVal) => {
    if (newVal) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem(THEME_KEY, newVal ? 'dark' : 'light')
  }, { immediate: true })

  /**
   * 初始化主题：优先读取 localStorage，其次跟随系统偏好
   */
  const initTheme = () => {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved) {
      isDark.value = saved === 'dark'
    } else {
      // 检测系统偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      isDark.value = prefersDark
    }
  }

  return {
    isDark,
    toggleTheme,
    setTheme,
    initTheme,
  }
}
