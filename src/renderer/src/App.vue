<template>
  <div class="app-shell">
    <InstallView
      v-if="!dashboardUrl"
      :steps="steps"
      :current="currentStep"
      :log-summary="logSummary"
      :error="error"
      :started="started"
      @start="start"
      @retry="retry"
      @copy-logs="copyLogs"
    />
    <DashboardView v-else :url="dashboardUrl" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import InstallView from './components/InstallView.vue'
import DashboardView from './components/DashboardView.vue'

type InstallError = { code: string; message: string }

const steps = [
  'Checking environment',
  'Resolving Node.js LTS',
  'Installing Node.js',
  'Installing Git',
  'Installing OpenClaw',
  'Starting Gateway',
  'Fetching Dashboard URL'
]

const currentStep = ref('Ready')
const logs = ref<string[]>([])
const error = ref<InstallError | null>(null)
const started = ref(false)
const dashboardUrl = ref<string | null>(null)

const logSummary = computed(() => logs.value.slice(-6))

const openclaw = (window as any).openclaw

const start = async () => {
  if (!openclaw) return
  started.value = true
  error.value = null
  logs.value = []
  currentStep.value = 'Checking environment'
  try {
    await openclaw.startInstall()
  } catch (err: any) {
    error.value = { code: 'START_FAILED', message: err?.message || 'Failed to start.' }
  }
}

const retry = async () => {
  if (!openclaw) return
  error.value = null
  logs.value = []
  currentStep.value = 'Checking environment'
  try {
    await openclaw.retryInstall()
  } catch (err: any) {
    error.value = { code: 'RETRY_FAILED', message: err?.message || 'Retry failed.' }
  }
}

const copyLogs = async () => {
  if (!openclaw) return
  const logLines = await openclaw.getLogs()
  await navigator.clipboard.writeText(logLines.join('\n'))
}

onMounted(() => {
  if (!openclaw) return
  openclaw.onLog((msg: string) => {
    logs.value.push(msg.trim())
  })
  openclaw.onStep((step: string) => {
    currentStep.value = step
    started.value = true
  })
  openclaw.onError((payload: InstallError) => {
    error.value = payload
  })
  openclaw.onSuccess((payload: { dashboardUrl: string }) => {
    dashboardUrl.value = payload.dashboardUrl
  })
})
</script>
