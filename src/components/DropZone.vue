<template>
  <!--
    DropZone 组件
    文件拖拽上传覆盖层：全屏显示拖拽反馈
    当用户将文件拖入窗口时显示
  -->
  <Transition name="fade">
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center
             bg-indigo-500/10 dark:bg-indigo-400/10 backdrop-blur-sm"
      @dragover.prevent
      @drop.prevent="$emit('drop', $event)"
      @dragleave="$emit('leave')"
    >
      <div class="flex flex-col items-center gap-4 p-12 rounded-3xl
                  border-2 border-dashed border-indigo-400 dark:border-indigo-500
                  bg-white/80 dark:bg-slate-900/80 shadow-2xl
                  animate-pulse">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                    flex items-center justify-center shadow-lg">
          <Upload :size="36" class="text-white" />
        </div>
        <div class="text-center">
          <p class="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
            释放以上传文件
          </p>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            支持 .md / .markdown 格式
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
/**
 * DropZone 组件
 * 全屏拖拽遮罩层
 * Props:
 *   - visible: 是否显示遮罩
 * Emits:
 *   - drop(event): 文件拖入事件
 *   - leave: 离开事件
 */
import { Upload } from 'lucide-vue-next'

defineProps({
  visible: { type: Boolean, default: false },
})
defineEmits(['drop', 'leave'])
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
