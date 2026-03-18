<template>
  <div class="app-shell">
    <InstallView
      v-if="stage === 'install'"
      :steps="steps"
      :current="currentStep"
      :log-summary="logSummary"
      :error="error"
      :started="started"
      @start="start"
      @retry="retry"
      @copy-logs="copyLogs"
    />
    <AuthView
      v-else-if="stage === 'auth'"
      :running="authRunning"
      :url="authUrl"
      :user-code="authCode"
      :log-summary="logSummary"
      :error="authError"
      :done="authDone"
      @start-auth="startAuth"
      @retry-auth="startAuth"
    />
    <LaunchView
      v-else-if="stage === 'launch'"
      :starting="gatewayStarting"
      :error="gatewayError"
      @start-gateway="startGateway"
    />
    <DashboardView v-else :url="dashboardUrl" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import InstallView from './components/InstallView.vue'
import AuthView from './components/AuthView.vue'
import LaunchView from './components/LaunchView.vue'
import DashboardView from './components/DashboardView.vue'

type InstallError = { code: string; message: string }

const steps = [
  'Checking environment',
  'Resolving Node.js LTS',
  'Installing Node.js',
  'Installing Git',
  'Installing OpenClaw'
]

const stage = ref<'install' | 'auth' | 'launch' | 'dashboard'>('install')
const currentStep = ref('Ready')
const logs = ref<string[]>([])
const error = ref<InstallError | null>(null)
const started = ref(false)
const dashboardUrl = ref<string | null>(null)
const authUrl = ref<string | null>(null)
const authCode = ref<string | null>(null)
const authDone = ref(false)
const authRunning = ref(false)
const authError = ref<InstallError | null>(null)
const gatewayStarting = ref(false)
const gatewayError = ref<InstallError | null>(null)

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

const startAuth = async () => {
  if (!openclaw) return
  authError.value = null
  authDone.value = false
  authRunning.value = true
  logs.value = []
  try {
    await openclaw.startAuth()
  } catch (err: any) {
    authRunning.value = false
    authError.value = { code: 'AUTH_START_FAILED', message: err?.message || 'Auth start failed.' }
  }
}

const startGateway = async () => {
  if (!openclaw) return
  gatewayError.value = null
  gatewayStarting.value = true
  try {
    await openclaw.startGateway()
  } catch (err: any) {
    gatewayStarting.value = false
    gatewayError.value = { code: 'GATEWAY_START_FAILED', message: err?.message || 'Gateway start failed.' }
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
  openclaw.onInstallDone(() => {
    stage.value = 'auth'
    started.value = false
    currentStep.value = 'Install complete'
  })
  openclaw.onAuthProgress((payload: { url: string | null; userCode: string | null; message: string }) => {
    authUrl.value = payload.url
    authCode.value = payload.userCode
    authRunning.value = true
  })
  openclaw.onAuthDone(() => {
    authDone.value = true
    authRunning.value = false
    stage.value = 'launch'
  })
  openclaw.onAuthError((payload: InstallError) => {
    authRunning.value = false
    authError.value = payload
  })
  openclaw.onGatewayReady((payload: { dashboardUrl: string }) => {
    dashboardUrl.value = payload.dashboardUrl
    gatewayStarting.value = false
    stage.value = 'dashboard'
  })
})
</script>
