<template>
  <section class="install-card">
    <header class="install-header">
      <div class="brand">
        <div class="brand-mark">OC</div>
        <div>
          <h1>OpenClaw</h1>
          <p>准备启动控制台</p>
        </div>
      </div>
      <div class="status-pill">{{ stageLabel }}</div>
    </header>

    <div v-if="error" class="error">
      <p class="error-title">启动失败</p>
      <p>启动失败，请稍后重试。</p>
      <p class="error-detail">{{ error.message }}</p>
      <button class="primary" @click="emit('start-gateway')">重试</button>
    </div>

    <div v-else class="actions">
      <button class="primary" :disabled="starting" @click="emit('start-gateway')">
        <span class="btn-label" :class="{ 'is-hidden': starting }">{{ starting ? '启动中…' : '启动控制台' }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  starting: boolean
  error: { code: string; message: string } | null
  stageLabel: string
}>()

const emit = defineEmits<{
  (event: 'start-gateway'): void
}>()
</script>
