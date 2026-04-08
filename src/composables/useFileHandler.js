/**
 * useFileHandler.js
 * Composable：处理文件上传和拖拽逻辑
 * 支持：
 * 1. <input type="file"> 点击上传
 * 2. 拖拽文件到指定区域
 * 3. 读取 .md 文件内容
 */

import { ref } from 'vue'

export function useFileHandler() {
  // 拖拽状态（用于视觉反馈）
  const isDragging = ref(false)
  // 当前加载的文件名
  const fileName = ref('')
  // 错误信息
  const fileError = ref('')

  /**
   * 读取 File 对象的文本内容
   * @param {File} file - 要读取的文件对象
   * @returns {Promise<string>} - 文件内容字符串
   */
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      // 验证文件类型：只接受 .md 和 .markdown 文件
      if (!file.name.match(/\.(md|markdown)$/i)) {
        reject(new Error(`"${file.name}" 不是有效的 Markdown 文件（仅支持 .md / .markdown）`))
        return
      }
      // 验证文件大小：限制 10MB
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('文件过大，请上传 10MB 以内的文件'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file, 'UTF-8')
    })
  }

  /**
   * 处理文件选择（input change 事件）
   * @param {Event} event - input change 事件
   * @param {Function} onSuccess - 成功回调，接收文件内容字符串
   */
  const handleFileSelect = async (event, onSuccess) => {
    const file = event.target.files[0]
    if (!file) return
    await loadFile(file, onSuccess)
    // 清空 input，允许重复上传相同文件
    event.target.value = ''
  }

  /**
   * 处理拖拽放下事件
   * @param {DragEvent} event - drop 事件
   * @param {Function} onSuccess - 成功回调
   */
  const handleDrop = async (event, onSuccess) => {
    event.preventDefault()
    isDragging.value = false

    const file = event.dataTransfer.files[0]
    if (!file) return
    await loadFile(file, onSuccess)
  }

  /**
   * 通用文件加载逻辑
   */
  const loadFile = async (file, onSuccess) => {
    fileError.value = ''
    try {
      const content = await readFileContent(file)
      fileName.value = file.name
      onSuccess(content)
    } catch (err) {
      fileError.value = err.message
      // 3 秒后自动清除错误提示
      setTimeout(() => { fileError.value = '' }, 3000)
    }
  }

  // 拖拽进入区域
  const handleDragEnter = (event) => {
    event.preventDefault()
    isDragging.value = true
  }

  // 拖拽离开区域
  const handleDragLeave = (event) => {
    // 防止子元素触发 dragleave 导致闪烁
    if (!event.currentTarget.contains(event.relatedTarget)) {
      isDragging.value = false
    }
  }

  // 拖拽经过区域（必须阻止默认行为才能触发 drop）
  const handleDragOver = (event) => {
    event.preventDefault()
  }

  return {
    isDragging,
    fileName,
    fileError,
    handleFileSelect,
    handleDrop,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
  }
}
