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
      <div class="status-pill">{{ current || 'Ready' }}</div>
    </header>

    <StepList :steps="steps" :current="current" />

    <div class="log-summary">
      <p v-for="(line, index) in logSummary" :key="`${line}-${index}`">{{ line }}</p>
      <p v-if="!logSummary.length" class="log-placeholder">Logs will appear here as the setup runs.</p>
    </div>

    <div v-if="error" class="error">
      <div class="error-title">Installation halted</div>
      <p>{{ error.message }}</p>
      <div class="error-actions">
        <button class="primary" @click="emit('retry')">重试</button>
        <button class="ghost" @click="emit('copyLogs')">复制日志</button>
      </div>
    </div>

    <div v-else class="actions">
      <button class="primary" @click="emit('start')" :disabled="started">
        {{ started ? '安装中…' : '开始安装' }}
      </button>
      <button v-if="started" class="ghost" @click="emit('copyLogs')">复制日志</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import StepList from './StepList.vue'

defineProps<{ 
  steps: string[]
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
</script>
