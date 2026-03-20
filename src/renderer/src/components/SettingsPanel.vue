<template>
  <section class="settings-panel">
    <div class="panel-stack">
      <div class="panel-section panel-header">
        <div class="panel-title">
          <img class="panel-logo" :src="openclawLogoUrl" alt="OpenClaw logo" />
          <div>
            <h2>设置中心</h2>
            <p>管理本地安装、配置与卸载操作。</p>
          </div>
        </div>
        <span class="status-chip">{{ statusLabel }}</span>
      </div>

      <div class="panel-section">
        <div class="settings-card danger-card">
          <div class="settings-card-header">
            <div>
              <h3>完整卸载 OpenClaw</h3>
              <p>将清理全局命令、缓存与用户目录中的 OpenClaw 数据。</p>
            </div>
            <span class="danger-tag">高风险操作</span>
          </div>
          <ul class="settings-list">
            <li>停止当前应用启动的 OpenClaw 进程</li>
            <li>卸载 npm / pnpm / yarn 全局包</li>
            <li>移除全局命令与 npm 全局库</li>
            <li>清理 ~/.openclaw 与系统缓存目录</li>
            <li>清除可能的 shell 补全与路径残留</li>
          </ul>
          <div class="action-row">
            <button
              class="btn danger"
              type="button"
              :disabled="isRunning"
              @click="handlePrimary"
            >
              {{ isRunning ? '正在卸载…' : '开始卸载' }}
            </button>
            <button class="btn ghost" type="button" :disabled="isRunning" @click="showManual = !showManual">
              {{ showManual ? '收起手动说明' : '查看手动卸载' }}
            </button>
          </div>

          <div v-if="confirming" class="confirm-box">
            <p class="confirm-text">此操作不可撤销，确定要继续卸载吗？</p>
            <div class="action-row">
              <button class="btn danger" type="button" :disabled="isRunning" @click="startUninstall">
                确认卸载
              </button>
              <button class="btn ghost" type="button" :disabled="isRunning" @click="confirming = false">
                取消
              </button>
            </div>
          </div>

          <div v-if="isRunning" class="settings-progress">
            <div class="spinner" aria-hidden="true"></div>
            <p>正在卸载，请不要关闭应用。</p>
          </div>

          <div v-if="uninstallState === 'error' && uninstallError" class="error-card">
            <p class="error-title">卸载失败</p>
            <p class="error-desc">请查看日志，必要时使用下方手动脚本。</p>
            <p class="error-detail">{{ uninstallError }}</p>
          </div>

          <div v-if="uninstallState === 'success'" class="success-card">
            <div class="success-title">卸载完成</div>
            <p class="success-desc">如系统仍存在 openclaw 命令，请根据手动说明再清理一次。</p>
          </div>

          <div v-if="uninstallLogs.length" class="log-terminal" aria-live="polite">
            <p v-for="(line, index) in uninstallLogs" :key="`${index}-${line}`">{{ line }}</p>
          </div>
        </div>
      </div>

      <div v-if="showManual" class="panel-section">
        <div class="settings-card">
          <div class="settings-card-header">
            <div>
              <h3>手动卸载说明</h3>
              <p>如果希望在终端手动执行，可以复制以下脚本。</p>
            </div>
          </div>

          <div class="settings-guides">
            <details class="settings-guide" open>
              <summary>macOS 一键卸载</summary>
              <pre class="settings-code">{{ macScript }}</pre>
              <div class="action-row align-left">
                <button class="btn ghost" type="button" @click="copyScript(macScript)">
                  复制 macOS 脚本
                </button>
              </div>
            </details>

            <details class="settings-guide">
              <summary>Windows PowerShell 一键卸载</summary>
              <pre class="settings-code">{{ windowsScript }}</pre>
              <div class="action-row align-left">
                <button class="btn ghost" type="button" @click="copyScript(windowsScript)">
                  复制 Windows 脚本
                </button>
              </div>
            </details>
          </div>

          <div class="settings-note">
            <p>如果你使用了 nvm 或多个 Node 版本，请切换到每个版本后重复卸载步骤。</p>
            <p>卸载完成后建议重启终端，再验证 openclaw 命令是否仍存在。</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { openclawLogoUrl } from '../assets/branding'

type UninstallState = 'idle' | 'running' | 'success' | 'error'

const openclaw = (window as any).openclaw

const uninstallState = ref<UninstallState>('idle')
const uninstallLogs = ref<string[]>([])
const uninstallError = ref<string | null>(null)
const confirming = ref(false)
const showManual = ref(false)

const isRunning = computed(() => uninstallState.value === 'running')
const statusLabel = computed(() => {
  if (uninstallState.value === 'running') return '正在卸载'
  if (uninstallState.value === 'success') return '卸载完成'
  if (uninstallState.value === 'error') return '卸载失败'
  return '未执行'
})

const macScript = `# 1. 停止进程
pkill -f "openclaw gateway" 2>/dev/null || true
pkill -f "openclaw models" 2>/dev/null || true

# 2. npm / pnpm / yarn 全局卸载
npm uninstall -g openclaw 2>/dev/null || true
pnpm remove -g openclaw 2>/dev/null || true
yarn global remove openclaw 2>/dev/null || true

# 3. 删除全局 bin
rm -f "$(npm bin -g)/openclaw" 2>/dev/null || true
rm -f "$(npm bin -g)/openclaw.cmd" 2>/dev/null || true

# 4. 删除 Node 全局 lib
rm -rf "$(npm root -g)/openclaw" 2>/dev/null || true

# 5. 删除用户配置
rm -rf ~/.openclaw

# 6. 系统残留
rm -rf ~/Library/Application\ Support/openclaw
rm -rf ~/Library/Logs/openclaw
rm -rf ~/Library/Caches/openclaw

# 7. 删除可能的二进制
rm -f /usr/local/bin/openclaw
rm -f /opt/homebrew/bin/openclaw

# 8. 删除 shell 自动补全
sed -i '' '/openclaw/d' ~/.zshrc 2>/dev/null || true
sed -i '' '/openclaw/d' ~/.bashrc 2>/dev/null || true
sed -i '' '/openclaw/d' ~/.zprofile 2>/dev/null || true
`

const windowsScript = `# 1. 停掉进程
Get-Process *openclaw* -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. npm / pnpm / yarn 卸载
npm uninstall -g openclaw 2>$null
pnpm remove -g openclaw 2>$null
yarn global remove openclaw 2>$null

# 3. 删除 npm 全局路径
$npmRoot = npm root -g
$npmBin = npm bin -g

Remove-Item -Recurse -Force "$npmRoot\\openclaw" -ErrorAction SilentlyContinue
Remove-Item -Force "$npmBin\\openclaw.cmd" -ErrorAction SilentlyContinue
Remove-Item -Force "$npmBin\\openclaw" -ErrorAction SilentlyContinue

# 4. 删除用户目录
Remove-Item -Recurse -Force "$env:USERPROFILE\\.openclaw" -ErrorAction SilentlyContinue

# 5. 删除 AppData
Remove-Item -Recurse -Force "$env:APPDATA\\openclaw" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\\openclaw" -ErrorAction SilentlyContinue

# 6. ProgramData
Remove-Item -Recurse -Force "C:\\ProgramData\\openclaw" -ErrorAction SilentlyContinue
`

const handlePrimary = () => {
  if (isRunning.value) return
  confirming.value = true
}

const startUninstall = async () => {
  if (!openclaw?.uninstall) {
    uninstallState.value = 'error'
    uninstallError.value = '未检测到卸载能力，请检查应用版本。'
    return
  }
  uninstallState.value = 'running'
  uninstallError.value = null
  uninstallLogs.value = []
  confirming.value = false

  try {
    const result = await openclaw.uninstall()
    if (result?.logs?.length) {
      uninstallLogs.value = result.logs
    }
    if (result?.ok) {
      uninstallState.value = 'success'
      return
    }
    uninstallState.value = 'error'
    uninstallError.value = result?.error || '卸载未完全完成，请查看日志。'
  } catch (error: any) {
    uninstallState.value = 'error'
    uninstallError.value = error?.message || '卸载失败，请稍后重试。'
  }
}

const copyScript = async (script: string) => {
  try {
    await navigator.clipboard.writeText(script)
    uninstallLogs.value.push('已复制脚本到剪贴板。')
  } catch {
    uninstallLogs.value.push('复制失败，请手动选择脚本内容。')
  }
}

onMounted(() => {
  if (!openclaw?.onUninstallLog) return
  openclaw.onUninstallLog((msg: string) => {
    uninstallLogs.value.push(msg)
  })
})
</script>
