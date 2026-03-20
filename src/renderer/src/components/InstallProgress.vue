<template>
  <div class="install-progress">
    <div class="progress-header">
      <span class="progress-title">{{ currentStep }}</span>
      <span class="progress-value">{{ Math.round(progress) }}%</span>
    </div>
    <div class="progress-track" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
      <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
    </div>
    <div ref="logRef" class="log-terminal" role="log" aria-live="polite">
      <p v-for="(line, index) in logSummary" :key="`${line}-${index}`">{{ line }}</p>
      <p v-if="!logSummary.length" class="log-placeholder">正在准备安装任务…</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  currentStep: string
  progress: number
  logSummary: string[]
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
