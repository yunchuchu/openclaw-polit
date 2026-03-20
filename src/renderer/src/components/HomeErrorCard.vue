<template>
  <section class="error-panel">
    <div class="error-icon">!</div>
    <div class="error-content">
      <h2>控制台启动失败</h2>
      <p>我们已检测到控制台未能正常启动，请稍后重试。</p>
      <p v-if="error" class="error-detail">{{ error.message }}</p>
      <button class="btn primary" type="button" :disabled="starting" @click="emit('retry')">
        {{ starting ? '正在重启…' : '重启控制台' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  error: { code: string; message: string } | null
  starting: boolean
}>()

const emit = defineEmits<{
  (event: 'retry'): void
}>()
</script>
