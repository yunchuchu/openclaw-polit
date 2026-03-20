<template>
  <section class="install-panel">
    <div class="panel-stack">
      <div class="panel-section panel-header">
        <div class="panel-title">
          <img class="panel-logo" :src="openclawLogoUrl" alt="OpenClaw logo" />
          <div>
            <h2>OpenClaw 安装向导</h2>
            <p>准备就绪后，我们会自动完成环境检测与依赖安装。</p>
          </div>
        </div>
        <span class="status-chip">{{ statusLabel }}</span>
      </div>

      <div class="panel-section panel-body">
        <div v-if="error" class="error-card">
          <p class="error-title">安装失败</p>
          <p class="error-desc">请检查网络或权限后重试。</p>
          <p class="error-detail">{{ error.message }}</p>
          <div class="action-row">
            <button class="btn primary" type="button" @click="emit('retry')">重试安装</button>
            <button class="btn ghost" type="button" @click="emit('copy-logs')">复制日志</button>
          </div>
        </div>

        <div v-else-if="stage === 'install-success'" class="success-card">
          <div class="success-title">恭喜安装成功</div>
          <p class="success-desc">请先完成模型配置，再手动启动控制台。</p>
          <div class="action-row">
            <button class="btn ghost" type="button" @click="emit('go-model-api')">
              Qwen自动授权/API手动配置
            </button>
            <button class="btn primary" type="button" @click="emit('start-gateway')">启动控制台</button>
          </div>
          <p v-if="authNotice" class="success-note">{{ authNotice }}</p>
        </div>

        <div v-else class="panel-content">
          <div v-if="stage === 'install'" class="panel-tip">
            <p class="panel-tip-title">自动安装内容</p>
            <ul class="panel-tip-list">
              <li>检测本机环境与权限</li>
              <li>安装并配置 Node.js / Git</li>
              <li>拉起 OpenClaw 控制台服务</li>
            </ul>
          </div>

          <InstallProgress
            v-if="stage === 'installing'"
            :current-step="currentStep"
            :progress="progress"
            :log-summary="logSummary"
          />
        </div>
      </div>

      <div class="panel-section panel-actions">
        <div v-if="stage === 'install'" class="action-row">
          <button class="btn primary" type="button" :disabled="started" @click="emit('start')">
            {{ started ? '安装进行中…' : '开始安装' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InstallProgress from './InstallProgress.vue'
import { openclawLogoUrl } from '../assets/branding'

const props = defineProps<{
  stage: 'install' | 'installing' | 'install-success'
  currentStep: string
  logSummary: string[]
  error: { code: string; message: string } | null
  started: boolean
  progress: number
  authNotice: string | null
}>()

const emit = defineEmits<{
  (event: 'start'): void
  (event: 'retry'): void
  (event: 'copy-logs'): void
  (event: 'go-model-api'): void
  (event: 'start-gateway'): void
}>()

const statusLabel = computed(() => {
  if (props.stage === 'install-success') return '安装完成'
  if (props.stage === 'installing') return '正在安装'
  return '等待开始'
})
</script>
