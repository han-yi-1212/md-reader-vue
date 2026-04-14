<template>
  <!--
    AppHeader 组件
    顶部工具栏：Logo、文件名、视图模式切换、主题切换
  -->
  <header
    class="flex items-center justify-between px-4 h-14 border-b transition-theme
           bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700
           shadow-sm z-10 relative"
  >
    <!-- 左侧：Logo + 文件名 -->
    <div class="flex items-center gap-3 min-w-0">
      <!-- Logo 图标 -->
      <div class="flex items-center gap-2 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600
                    flex items-center justify-center shadow-md">
          <FileText :size="16" class="text-white" />
        </div>
        <span class="font-bold text-base text-slate-800 dark:text-slate-100 hidden sm:block">
          MD Reader
        </span>
      </div>

      <!-- 分隔线 -->
      <div class="w-px h-5 bg-slate-200 dark:bg-slate-700 hidden sm:block" />

      <!-- 当前文件名（有文件时显示） -->
      <div v-if="fileName" class="flex items-center gap-1.5 min-w-0">
        <File :size="14" class="text-indigo-500 shrink-0" />
        <span class="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
          {{ fileName }}
        </span>
      </div>
      <!-- 无文件时的提示 -->
      <span v-else class="text-sm text-slate-400 dark:text-slate-600 hidden sm:block">
        未加载文件
      </span>
    </div>

    <!-- 中间：视图模式切换按钮组 -->
    <div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
      <!-- 纯编辑模式 -->
      <button
        @click="$emit('mode-change', 'edit')"
        :class="['toolbar-btn', { active: currentMode === 'edit' }]"
        title="编辑模式"
      >
        <PenLine :size="15" />
        <span class="hidden md:block">编辑</span>
      </button>

      <!-- 分屏模式 -->
      <button
        @click="$emit('mode-change', 'split')"
        :class="['toolbar-btn', { active: currentMode === 'split' }]"
        title="分屏模式"
      >
        <Columns :size="15" />
        <span class="hidden md:block">分屏</span>
      </button>

      <!-- 纯预览模式 -->
      <button
        @click="$emit('mode-change', 'preview')"
        :class="['toolbar-btn', { active: currentMode === 'preview' }]"
        title="预览模式"
      >
        <Eye :size="15" />
        <span class="hidden md:block">预览</span>
      </button>
    </div>

    <!-- 右侧：操作按钮 -->
    <div class="flex items-center gap-1.5 sm:gap-2">
      <!-- 目录侧边栏开关 -->
      <button
        @click="$emit('toggle-toc')"
        :class="['toolbar-btn', { active: tocVisible }]"
        title="切换目录"
      >
        <List :size="15" />
        <span class="hidden lg:block">目录</span>
      </button>

      <!-- 主题切换 -->
      <button
        @click="$emit('toggle-theme')"
        class="toolbar-btn"
        :title="isDark ? '切换到亮色模式' : '切换到暗色模式'"
      >
        <Sun v-if="isDark" :size="15" />
        <Moon v-else :size="15" />
      </button>

      <!-- 上传按钮 -->
      <label
        class="toolbar-btn cursor-pointer bg-indigo-500 hover:bg-indigo-600
               !text-white rounded-lg !bg-indigo-500 dark:!bg-indigo-600
               dark:hover:!bg-indigo-500 px-3 py-1.5"
        title="上传 Markdown 文件"
      >
        <Upload :size="15" />
        <span class="hidden sm:block">上传</span>
        <input
          type="file"
          accept=".md,.markdown"
          class="hidden"
          @change="$emit('file-select', $event)"
        />
      </label>
    </div>
  </header>
</template>

<script setup>
/**
 * AppHeader 组件
 * Props:
 *   - fileName: 当前文件名
 *   - currentMode: 当前视图模式（'edit' | 'split' | 'preview'）
 *   - isDark: 是否暗色模式
 *   - tocVisible: 目录侧边栏是否可见
 * Emits:
 *   - mode-change(mode): 切换视图模式
 *   - toggle-theme: 切换主题
 *   - toggle-toc: 切换目录显示
 *   - file-select(event): 文件选择事件
 */
import { FileText, File, PenLine, Columns, Eye, List, Sun, Moon, Upload } from 'lucide-vue-next'

defineProps({
  fileName: { type: String, default: '' },
  currentMode: { type: String, default: 'split' },
  isDark: { type: Boolean, default: false },
  tocVisible: { type: Boolean, default: true },
})

defineEmits(['mode-change', 'toggle-theme', 'toggle-toc', 'file-select'])
</script>
