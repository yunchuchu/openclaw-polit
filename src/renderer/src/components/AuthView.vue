<template>
  <section class="install-card">
    <header class="install-header">
      <div class="brand">
        <div class="brand-mark">OC</div>
        <div>
          <h1>OpenClaw</h1>
          <p>Model API 配置</p>
        </div>
      </div>
      <div class="status-pill">Qwen OAuth</div>
    </header>

    <div class="auth-body">
      <div class="actions">
        <button class="primary" :disabled="running" @click="emit('start-auth')">
          {{ running ? '正在授权…' : '开始授权' }}
        </button>
        <button v-if="error" class="ghost" @click="emit('retry-auth')">重试授权</button>
      </div>

      <div v-if="url" class="auth-frame">
        <webview
          :src="url"
          class="auth-webview"
          webpreferences="contextIsolation=yes, nodeIntegration=no"
        />
      </div>

      <div v-if="userCode" class="auth-code">授权码：<strong>{{ userCode }}</strong></div>

      <div class="log-summary">
        <p v-for="(line, index) in logSummary" :key="`${line}-${index}`">{{ line }}</p>
        <p v-if="!logSummary.length" class="log-placeholder">授权日志会显示在这里。</p>
      </div>

      <p v-if="error" class="auth-error">{{ error.message }}</p>
      <p v-else-if="done" class="auth-success">授权成功，请点击继续。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  running: boolean
  url: string | null
  userCode: string | null
  logSummary: string[]
  error: { code: string; message: string } | null
  done: boolean
}>()

const emit = defineEmits<{
  (event: 'start-auth'): void
  (event: 'retry-auth'): void
}>()
</script>
