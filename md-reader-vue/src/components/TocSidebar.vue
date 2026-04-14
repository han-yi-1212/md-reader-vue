<template>
  <!--
    TocSidebar 组件
    目录导航侧边栏：解析标题列表，点击平滑滚动到对应章节
  -->
  <aside
    class="flex flex-col h-full transition-theme border-r
           bg-slate-50 dark:bg-slate-900
           border-slate-200 dark:border-slate-700"
    style="width: 240px; min-width: 200px;"
  >
    <!-- 侧边栏标题栏 -->
    <div class="flex items-center justify-between px-4 py-3 border-b
                border-slate-200 dark:border-slate-700 shrink-0">
      <div class="flex items-center gap-2">
        <BookOpen :size="15" class="text-indigo-500" />
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">目录</span>
      </div>
      <!-- 标题数量 badge -->
      <span class="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600
                   dark:text-indigo-400 px-2 py-0.5 rounded-full font-mono">
        {{ headings.length }}
      </span>
    </div>

    <!-- 目录列表 -->
    <nav class="flex-1 overflow-y-auto py-2 px-2">
      <!-- 无标题时的空状态 -->
      <div v-if="headings.length === 0" class="flex flex-col items-center justify-center
           py-10 text-center text-slate-400 dark:text-slate-600 gap-2">
        <AlignLeft :size="28" class="opacity-40" />
        <p class="text-xs leading-relaxed">上传 Markdown 文件后<br>自动生成目录</p>
      </div>

      <!-- 目录项列表 -->
      <ul v-else class="space-y-0.5">
        <li
          v-for="heading in headings"
          :key="heading.id"
          class="relative"
        >
          <button
            @click="scrollToHeading(heading.anchor)"
            :class="[
              'w-full text-left text-sm py-1.5 pr-2 rounded-lg cursor-pointer',
              'transition-all duration-150 hover:bg-slate-200 dark:hover:bg-slate-700/60',
              'text-slate-600 dark:text-slate-400',
              activeAnchor === heading.anchor ? 'toc-item-active bg-indigo-50 dark:bg-indigo-950/50' : '',
            ]"
            :style="{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }"
            :title="heading.text"
          >
            <!-- H1 显示实心圆点，H2 显示空心圆，H3+ 显示短横线 -->
            <span class="inline-block mr-1.5 shrink-0 align-middle opacity-50" style="width:6px">
              <template v-if="heading.level === 1">●</template>
              <template v-else-if="heading.level === 2">○</template>
              <template v-else>–</template>
            </span>
            <!-- 标题文本，超出截断 -->
            <span class="truncate inline-block align-middle"
                  :style="{ maxWidth: `${200 - (heading.level - 1) * 12}px` }">
              {{ heading.text }}
            </span>
          </button>
        </li>
      </ul>
    </nav>

    <!-- 底部状态栏 -->
    <div v-if="wordCount > 0"
         class="px-4 py-2 border-t border-slate-200 dark:border-slate-700 shrink-0">
      <div class="flex items-center justify-between text-xs text-slate-400 dark:text-slate-600">
        <span>约 {{ wordCount }} 字</span>
        <span>{{ headings.length }} 个标题</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
/**
 * TocSidebar 组件
 * Props:
 *   - headings: 标题数组，格式 [{ level, text, anchor, id }]
 *   - activeAnchor: 当前激活的锚点（视口内可见的标题）
 *   - wordCount: 文档字数（用于底部统计）
 * Emits: 无（直接操作 DOM 滚动）
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { BookOpen, AlignLeft } from 'lucide-vue-next'

const props = defineProps({
  headings: { type: Array, default: () => [] },
  activeAnchor: { type: String, default: '' },
  wordCount: { type: Number, default: 0 },
})

/**
 * 平滑滚动到指定锚点
 * 使用 scrollIntoView 保证跨浏览器兼容
 */
const scrollToHeading = (anchor) => {
  const el = document.getElementById(anchor)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>
