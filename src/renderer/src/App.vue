<template>
  <div class="app-shell">
    <TopBar />
    <div class="app-content">
      <SplashView v-if="stage === 'splash'" />
      <HomeShell v-else :active="activePanel" :disabled="installLocked" @select="selectPanel">
        <template #main>
          <DashboardView v-if="stage === 'home'" :url="dashboardUrl" :loading="gatewayStarting" />
          <SettingsPanel
            v-else-if="stage === 'settings'"
            :active-section="settingsSection"
            :basic-config-error="basicConfigError"
            :install-stage="installStage"
            :install-current-step="currentStep"
            :install-log-summary="logSummary"
            :install-error="error"
            :install-started="started"
            :install-progress="progressValue"
            :install-auth-notice="authNotice"
            @update:active-section="settingsSection = $event"
            @start-install="startInstall"
            @retry-install="retryInstall"
            @copy-logs="copyLogs"
            @start-gateway="startGateway"
          />
          <HomeErrorCard
            v-else-if="stage === 'home-error'"
            :error="homeError"
            :starting="gatewayStarting"
            @retry="startGateway"
          />
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
import HomeErrorCard from './components/HomeErrorCard.vue'
import PlaceholderPanel from './components/PlaceholderPanel.vue'
import DashboardView from './components/DashboardView.vue'
import SettingsPanel from './components/SettingsPanel.vue'

type InstallError = { code: string; message: string }
type SettingsSectionId = 'basic-config' | 'uninstall' | 'model-api' | 'reset-config' | 'shutdown-restart'

const stage = ref<'splash' | 'home' | 'home-error' | 'skill' | 'settings'>('splash')
const currentStep = ref('准备就绪')
const logs = ref<string[]>([])
const error = ref<InstallError | null>(null)
const homeError = ref<InstallError | null>(null)
const started = ref(false)
const dashboardUrl = ref<string | null>(null)
const progressValue = ref(0)
const authNotice = ref<string | null>(null)
const gatewayStarting = ref(false)
const installStage = ref<'install' | 'installing' | 'install-success'>('install')
const settingsSection = ref<SettingsSectionId>('basic-config')
const basicConfigError = ref<InstallError | null>(null)

const logSummary = computed(() => logs.value)
const installLocked = computed(() => installStage.value === 'installing')
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
  basicConfigError.value = null
  currentStep.value = 'Checking environment'
  progressValue.value = 6
}

const showBasicConfig = (payload: InstallError | null = null) => {
  stage.value = 'settings'
  settingsSection.value = 'basic-config'
  basicConfigError.value = payload
}

const hasDashboardToken = (url: string | null) => {
  if (!url) return false
  return /(^|[#?&])token=/.test(url)
}

const startInstall = async () => {
  if (!openclaw) return
  installStage.value = 'installing'
  started.value = true
  authNotice.value = null
  resetInstallState()
  try {
    await openclaw.startInstall()
  } catch (err: any) {
    error.value = { code: 'START_FAILED', message: err?.message || '启动失败。' }
    installStage.value = 'install'
    showBasicConfig()
  }
}

const retryInstall = async () => {
  if (!openclaw) return
  installStage.value = 'installing'
  started.value = true
  authNotice.value = null
  resetInstallState()
  try {
    await openclaw.retryInstall()
  } catch (err: any) {
    error.value = { code: 'RETRY_FAILED', message: err?.message || '重试失败。' }
    installStage.value = 'install'
    showBasicConfig()
  }
}

const ensureGatewayToken = async () => {
  if (!openclaw?.ensureGatewayToken) return
  authNotice.value = null
  try {
    const result = await openclaw.ensureGatewayToken()
    if (!result?.ok) {
      basicConfigError.value = {
        code: 'TOKEN_GENERATE_FAILED',
        message: result?.error || '未检测到控制台 token，请先完成授权。'
      }
      return
    }
    if (!hasDashboardToken(result.dashboardUrl ?? null)) {
      basicConfigError.value = {
        code: 'TOKEN_MISSING',
        message: '未检测到控制台 token，请先完成授权。'
      }
      return
    }
    authNotice.value = '已自动准备启动 token，可继续配置模型后启动控制台。'
  } catch (err: any) {
    basicConfigError.value = {
      code: 'TOKEN_GENERATE_FAILED',
      message: err?.message || '未检测到控制台 token，请先完成授权。'
    }
  }
}

const startGateway = async () => {
  if (!openclaw) return
  homeError.value = null
  gatewayStarting.value = true
  dashboardUrl.value = null
  basicConfigError.value = null
  stage.value = 'home'
  try {
    await openclaw.startGateway()
  } catch (err: any) {
    gatewayStarting.value = false
    showBasicConfig({ code: 'GATEWAY_START_FAILED', message: err?.message || '启动失败。' })
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
    showBasicConfig({ code: 'BOOTSTRAP_MISSING', message: '未检测到启动能力，请先安装。' })
    return
  }

  const bootstrapPromise = openclaw.startupBootstrap().catch(() => null)
  const [result] = await Promise.all([bootstrapPromise, delay(3000)])

  if (!result || !result.installed) {
    showBasicConfig({ code: 'NOT_INSTALLED', message: '未检测到 OpenClaw，请先完成安装。' })
    return
  }

  if (result.error) {
    showBasicConfig(result.error)
    return
  }

  if (result.tokenReady === false) {
    showBasicConfig({ code: 'TOKEN_MISSING', message: '未检测到控制台 token，请先完成授权。' })
    return
  }

  if (result.dashboardUrl) {
    if (!hasDashboardToken(result.dashboardUrl)) {
      showBasicConfig({ code: 'TOKEN_MISSING', message: '未检测到控制台 token，请先完成授权。' })
      return
    }
    dashboardUrl.value = result.dashboardUrl
    stage.value = 'home'
    return
  }
  showBasicConfig({ code: 'DASHBOARD_MISSING', message: '未获取到控制台地址，请重试。' })
}

onMounted(() => {
  if (!openclaw) {
    showBasicConfig({ code: 'NOT_INSTALLED', message: '未检测到 OpenClaw，请先完成安装。' })
    return
  }
  openclaw.onLog((msg: string) => {
    const line = msg.trim()
    if (line) logs.value.push(line)
    if (started.value && installStage.value === 'installing' && progressValue.value < 95) {
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
    installStage.value = 'install'
    showBasicConfig()
  })
  openclaw.onInstallDone(() => {
    installStage.value = 'install-success'
    started.value = false
    currentStep.value = 'Install complete'
    progressValue.value = 100
    ensureGatewayToken()
  })
  openclaw.onGatewayReady((payload: { dashboardUrl: string }) => {
    if (!hasDashboardToken(payload.dashboardUrl)) {
      gatewayStarting.value = false
      showBasicConfig({ code: 'TOKEN_MISSING', message: '未检测到控制台 token，请先完成授权。' })
      return
    }
    dashboardUrl.value = payload.dashboardUrl
    gatewayStarting.value = false
    homeError.value = null
    stage.value = 'home'
  })

  bootstrap()
})
</script>
