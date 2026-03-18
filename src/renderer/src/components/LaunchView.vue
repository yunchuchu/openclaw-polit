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
      <div class="status-pill">Ready</div>
    </header>

    <div class="actions">
      <button class="primary" :disabled="starting" @click="emit('start-gateway')">
        {{ starting ? '启动中…' : '启动控制台' }}
      </button>
    </div>

    <p v-if="error" class="auth-error">{{ error.message }}</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  starting: boolean
  error: { code: string; message: string } | null
}>()

const emit = defineEmits<{
  (event: 'start-gateway'): void
}>()
</script>
