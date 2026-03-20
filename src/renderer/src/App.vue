<template>
  <div class="app-shell">
    <TopBar />
    <div class="app-content">
      <SplashView v-if="stage === 'splash'" />
      <HomeShell v-else :active="activePanel" :disabled="installLocked" @select="selectPanel">
        <template #main>
          <InstallPanel
            v-if="isInstallStage"
            :stage="installStage"
            :current-step="currentStep"
            :log-summary="logSummary"
            :error="error"
            :started="started"
            :progress="progressValue"
            :auth-notice="authNotice"
            @start="startInstall"
            @retry="retryInstall"
            @copy-logs="copyLogs"
            @start-auth="startExternalAuth"
            @start-gateway="startGateway"
          />
          <HomeErrorCard
            v-else-if="stage === 'home-error'"
            :error="homeError"
            :starting="gatewayStarting"
            @retry="startGateway"
          />
          <DashboardView
            v-else-if="stage === 'home'"
            :url="dashboardUrl"
            :loading="gatewayStarting"
          />
          <SettingsPanel v-else-if="stage === 'settings'" />
          <PlaceholderPanel
            v-else
            :title="'安装 Skill 插件'"
            :description="'技能市场正在搭建中，敬请期待。'"
          />
        </template>
      </HomeShell>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import SplashView from './components/SplashView.vue'
import TopBar from './components/TopBar.vue'
import HomeShell from './components/HomeShell.vue'
import InstallPanel from './components/InstallPanel.vue'
import HomeErrorCard from './components/HomeErrorCard.vue'
import PlaceholderPanel from './components/PlaceholderPanel.vue'
import DashboardView from './components/DashboardView.vue'
import SettingsPanel from './components/SettingsPanel.vue'

type InstallError = { code: string; message: string }

const stage = ref<
  'splash' | 'install' | 'installing' | 'install-success' | 'home' | 'home-error' | 'skill' | 'settings'
>('splash')
const currentStep = ref('准备就绪')
const logs = ref<string[]>([])
const error = ref<InstallError | null>(null)
const homeError = ref<InstallError | null>(null)
const started = ref(false)
const dashboardUrl = ref<string | null>(null)
const progressValue = ref(0)
const authNotice = ref<string | null>(null)
const gatewayStarting = ref(false)

const logSummary = computed(() => logs.value)
const isInstallStage = computed(() =>
  stage.value === 'install' || stage.value === 'installing' || stage.value === 'install-success'
)
const installStage = computed<'install' | 'installing' | 'install-success'>(() =>
  isInstallStage.value ? stage.value : 'install'
)
const installLocked = computed(() => isInstallStage.value)
const activePanel = computed(() => {
  if (stage.value === 'skill') return 'skill'
  if (stage.value === 'settings') return 'settings'
  return 'console'
})

const openclaw = (window as any).openclaw

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const mapStepToProgress = (step: string) => {
  const normalized = step.toLowerCase()
  if (normalized.includes('checking environment')) return 10
  if (normalized.includes('resolving node.js lts')) return 20
  if (normalized.includes('installing node.js')) return 40
  if (normalized.includes('installing git')) return 60
  if (normalized.includes('installing openclaw')) return 85
  if (normalized.includes('install complete')) return 100
  return null
}

const updateProgressFromStep = (step: string) => {
  const mapped = mapStepToProgress(step)
  if (mapped !== null) {
    progressValue.value = Math.max(progressValue.value, mapped)
  }
}

const mapStepToLog = (step: string) => {
  const normalized = step.toLowerCase()
  if (normalized.includes('checking environment')) return '正在检测本机环境…'
  if (normalized.includes('resolving node.js lts')) return '正在匹配 Node.js LTS 版本…'
  if (normalized.includes('installing node.js')) return '正在安装 Node.js…'
  if (normalized.includes('installing git')) return '正在安装 Git…'
  if (normalized.includes('installing openclaw')) return '正在安装 OpenClaw…'
  return null
}

const resetInstallState = () => {
  logs.value = ['正在检测本机环境…', '准备读取系统依赖清单…']
  error.value = null
  currentStep.value = 'Checking environment'
  progressValue.value = 6
}

const startInstall = async () => {
  if (!openclaw) return
  stage.value = 'installing'
  started.value = true
  authNotice.value = null
  resetInstallState()
  try {
    await openclaw.startInstall()
  } catch (err: any) {
    error.value = { code: 'START_FAILED', message: err?.message || '启动失败。' }
    stage.value = 'install'
  }
}

const retryInstall = async () => {
  if (!openclaw) return
  stage.value = 'installing'
  started.value = true
  authNotice.value = null
  resetInstallState()
  try {
    await openclaw.retryInstall()
  } catch (err: any) {
    error.value = { code: 'RETRY_FAILED', message: err?.message || '重试失败。' }
    stage.value = 'install'
  }
}

const startExternalAuth = async () => {
  if (!openclaw) return
  authNotice.value = null
  try {
    const result = await openclaw.startExternalAuth()
    if (result?.opened) {
      authNotice.value = '已为你打开浏览器授权，请完成授权后返回继续启动。'
    } else if (result?.error) {
      authNotice.value = result.error
    } else {
      authNotice.value = '未能自动打开浏览器，请稍后重试。'
    }
  } catch (err: any) {
    authNotice.value = err?.message || '授权启动失败，请稍后再试。'
  }
}

const startGateway = async () => {
  if (!openclaw) return
  homeError.value = null
  gatewayStarting.value = true
  dashboardUrl.value = null
  stage.value = 'home'
  try {
    await openclaw.startGateway()
  } catch (err: any) {
    gatewayStarting.value = false
    homeError.value = { code: 'GATEWAY_START_FAILED', message: err?.message || '启动失败。' }
    stage.value = 'home-error'
  }
}

const copyLogs = async () => {
  if (!openclaw) return
  const logLines = await openclaw.getLogs()
  await navigator.clipboard.writeText(logLines.join('\n'))
}

const selectPanel = (panel: 'console' | 'skill' | 'settings') => {
  if (installLocked.value) return
  if (panel === 'console') stage.value = 'home'
  if (panel === 'skill') stage.value = 'skill'
  if (panel === 'settings') stage.value = 'settings'
}

const bootstrap = async () => {
  if (!openclaw?.startupBootstrap) {
    stage.value = 'install'
    return
  }

  const bootstrapPromise = openclaw.startupBootstrap().catch(() => null)
  const [result] = await Promise.all([bootstrapPromise, delay(3000)])

  if (!result || !result.installed) {
    stage.value = 'install'
    return
  }

  if (result.dashboardUrl) {
    dashboardUrl.value = result.dashboardUrl
    stage.value = 'home'
    return
  }

  if (result.error) {
    homeError.value = result.error
    stage.value = 'home-error'
    return
  }

  stage.value = 'home-error'
  homeError.value = { code: 'DASHBOARD_MISSING', message: '未获取到控制台地址，请重试。' }
}

onMounted(() => {
  if (!openclaw) {
    stage.value = 'install'
    return
  }
  openclaw.onLog((msg: string) => {
    const line = msg.trim()
    if (line) logs.value.push(line)
    if (started.value && stage.value === 'installing' && progressValue.value < 95) {
      progressValue.value = Math.min(95, progressValue.value + 0.6)
    }
  })
  openclaw.onStep((step: string) => {
    currentStep.value = step
    started.value = true
    updateProgressFromStep(step)
    const mapped = mapStepToLog(step)
    if (mapped && logs.value[logs.value.length - 1] !== mapped) {
      logs.value.push(mapped)
    }
  })
  openclaw.onError((payload: InstallError) => {
    error.value = payload
    stage.value = 'install'
  })
  openclaw.onInstallDone(() => {
    stage.value = 'install-success'
    started.value = false
    currentStep.value = 'Install complete'
    progressValue.value = 100
  })
  openclaw.onGatewayReady((payload: { dashboardUrl: string }) => {
    dashboardUrl.value = payload.dashboardUrl
    gatewayStarting.value = false
    homeError.value = null
    stage.value = 'home'
  })

  bootstrap()
})
</script>
