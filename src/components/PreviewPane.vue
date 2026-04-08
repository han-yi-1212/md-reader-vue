<template>
  <!--
    PreviewPane 组件
    右侧 Markdown 预览区：渲染 HTML 并应用 Tailwind typography 样式
  -->
  <div
    ref="containerRef"
    class="flex flex-col h-full transition-theme bg-white dark:bg-slate-900 overflow-hidden"
  >
    <!-- 预览区标题栏 -->
    <div class="flex items-center justify-between px-4 py-2 border-b shrink-0
                border-slate-200 dark:border-slate-700
                bg-slate-50 dark:bg-slate-800/50">
      <div class="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Eye :size="13" />
        <span>预览</span>
      </div>
      <!-- 实时更新指示器 -->
      <div class="flex items-center gap-1.5 text-xs text-green-500 dark:text-green-400">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        实时渲染
      </div>
    </div>

    <!-- Markdown 渲染区域 -->
    <div class="flex-1 overflow-y-auto">
      <!-- 有内容时使用 MarkdownViewer 组件渲染 -->
      <MarkdownViewer
        v-if="htmlContent"
        :content="htmlContent"
        class="prose prose-slate dark:prose-invert max-w-none
               px-6 py-8 md:px-10 animate-fade-in"
      />

      <!-- 空内容时显示欢迎界面 -->
      <div
        v-else
        class="flex flex-col items-center justify-center h-full py-20
               text-slate-400 dark:text-slate-600 animate-fade-in"
      >
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100
                    dark:from-indigo-900/40 dark:to-purple-900/40
                    flex items-center justify-center mb-4 shadow-inner">
          <FileText :size="28" class="text-indigo-400 dark:text-indigo-500" />
        </div>
        <p class="text-base font-medium mb-1 text-slate-500 dark:text-slate-500">
          准备就绪
        </p>
        <p class="text-sm text-center leading-relaxed">
          上传 .md 文件或在左侧编辑器中<br>输入 Markdown 内容
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * PreviewPane 组件
 * Props:
 *   - htmlContent: 已渲染的 HTML 字符串
 * Emits: 无
 */
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Eye, FileText } from 'lucide-vue-next'
import MarkdownViewer from './MarkdownViewer.vue'

const props = defineProps({
  htmlContent: { type: String, default: '' },
})

const emit = defineEmits(['heading-visible'])

const containerRef = ref(null)

/**
 * IntersectionObserver：监听标题元素进入视口
 * 用于联动目录高亮当前章节
 */
let observer = null

const setupHeadingObserver = () => {
  if (observer) observer.disconnect()

  observer = new IntersectionObserver(
    (entries) => {
      // 找到第一个进入视口的标题
      const visible = entries.find(e => e.isIntersecting)
      if (visible) {
        emit('heading-visible', visible.target.id)
      }
    },
    {
      // 在容器内部观察，触发阈值：进入视口顶部 20% 时触发
      root: containerRef.value,
      rootMargin: '-10% 0px -70% 0px',
      threshold: 0,
    }
  )

  // 观察预览区内所有标题元素
  const headings = containerRef.value?.querySelectorAll('h1, h2, h3, h4, h5, h6') || []
  headings.forEach(h => observer.observe(h))
}

/**
 * 内容更新后重新绑定 observer
 */
watch(() => props.htmlContent, async () => {
  await nextTick()
  setupHeadingObserver()
})

onMounted(() => {
  setupHeadingObserver()
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>
