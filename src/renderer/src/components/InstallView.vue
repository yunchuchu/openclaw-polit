<template>
  <section class="install-card">
    <header class="install-header">
      <div class="brand">
        <div class="brand-mark">OC</div>
        <div>
          <h1>OpenClaw</h1>
          <p>Gateway installer</p>
        </div>
      </div>
      <div class="status-pill">{{ current || '准备就绪' }}</div>
    </header>

    <div ref="logRef" class="log-summary">
      <p v-for="(line, index) in logSummary" :key="`${line}-${index}`">{{ line }}</p>
      <p v-if="!logSummary.length" class="log-placeholder">安装日志会显示在这里。</p>
    </div>

    <div v-if="error" class="error">
      <p class="error-title">安装失败</p>
      <p>安装失败，请检查网络或权限后重试。</p>
      <p class="error-detail">{{ error.message }}</p>
      <div class="error-actions">
        <button class="primary" @click="emit('retry')">重试</button>
        <button class="ghost" @click="emit('copyLogs')">复制日志</button>
      </div>
    </div>

    <div v-else class="actions">
      <button class="primary" @click="emit('start')" :disabled="started">
        <span class="btn-label" :class="{ 'is-hidden': started }">{{ started ? '安装中…' : '开始安装' }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  current: string
  logSummary: string[]
  error: { code: string; message: string } | null
  started: boolean
}>()

const emit = defineEmits<{
  (event: 'start'): void
  (event: 'retry'): void
  (event: 'copyLogs'): void
}>()

const logRef = ref<HTMLElement | null>(null)

watch(
  () => props.logSummary,
  async () => {
    await nextTick()
    if (logRef.value) {
      logRef.value.scrollTop = logRef.value.scrollHeight
    }
  },
  { deep: true }
)
</script>
