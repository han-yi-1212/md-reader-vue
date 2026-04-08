<template>
  <!--
    EditorPane 组件
    左侧 Markdown 编辑区：纯文本 textarea
  -->
  <div class="flex flex-col h-full transition-theme bg-white dark:bg-slate-900">
    <!-- 编辑区标题栏 -->
    <div class="flex items-center justify-between px-4 py-2 border-b shrink-0
                border-slate-200 dark:border-slate-700
                bg-slate-50 dark:bg-slate-800/50">
      <div class="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <PenLine :size="13" />
        <span>Markdown 编辑</span>
      </div>
      <!-- 光标位置显示 -->
      <span class="text-xs text-slate-400 dark:text-slate-600 font-mono">
        行 {{ cursorLine }} · 列 {{ cursorCol }}
      </span>
    </div>

    <!-- 文本编辑区 -->
    <textarea
      ref="textareaRef"
      class="editor-textarea flex-1"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @keydown="handleKeydown"
      @click="updateCursor"
      @keyup="updateCursor"
      placeholder="在此输入 Markdown 内容，或上传 .md 文件..."
      spellcheck="false"
    />
  </div>
</template>

<script setup>
/**
 * EditorPane 组件
 * Props:
 *   - modelValue: 编辑器内容（双向绑定）
 * Emits:
 *   - update:modelValue: 内容变化事件
 */
import { ref } from 'vue'
import { PenLine } from 'lucide-vue-next'

defineProps({
  modelValue: { type: String, default: '' },
})
defineEmits(['update:modelValue'])

const textareaRef = ref(null)
const cursorLine = ref(1)
const cursorCol = ref(1)

/**
 * 更新光标位置显示
 */
const updateCursor = () => {
  const el = textareaRef.value
  if (!el) return
  const text = el.value.substring(0, el.selectionStart)
  const lines = text.split('\n')
  cursorLine.value = lines.length
  cursorCol.value = lines[lines.length - 1].length + 1
}

/**
 * 处理快捷键：
 * - Tab: 插入 2 个空格（而不是切换焦点）
 */
const handleKeydown = (e) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    const el = e.target
    const start = el.selectionStart
    const end = el.selectionEnd
    const spaces = '  '
    // 在光标位置插入空格
    const newValue = el.value.substring(0, start) + spaces + el.value.substring(end)
    // 触发更新
    el.value = newValue
    el.selectionStart = el.selectionEnd = start + spaces.length
    // 手动派发 input 事件以触发 Vue 双向绑定
    el.dispatchEvent(new Event('input'))
  }
}
</script>
