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

      <div class="panel-section settings-layout">
        <nav class="settings-nav" aria-label="设置功能">
          <button
            v-for="item in settingsItems"
            :key="item.id"
            class="settings-nav-item"
            :class="{ active: activeSection === item.id, danger: item.tone === 'danger' }"
            type="button"
            :aria-current="activeSection === item.id ? 'page' : undefined"
            @click="selectSection(item.id)"
          >
            {{ item.label }}
          </button>
        </nav>

        <div class="settings-content">
          <div v-show="activeSection === 'uninstall'" class="settings-section">
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
                <button
                  class="btn ghost"
                  type="button"
                  :disabled="isRunning"
                  @click="showManual = !showManual"
                >
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

            <div v-if="showManual" class="settings-card">
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

          <div v-show="activeSection === 'model-api'" class="settings-section">
            <div class="settings-card">
              <div class="settings-card-header">
                <div>
                  <h3>模型 API 配置</h3>
                  <p>配置模型服务的 API 地址与鉴权信息。</p>
                </div>
                <span v-if="modelSaveState === 'success'" class="status-chip">已保存</span>
              </div>

              <div v-if="modelConfigLoading" class="settings-progress">
                <div class="spinner" aria-hidden="true"></div>
                <p>正在读取现有配置…</p>
              </div>

              <div v-else class="model-config-form">
                <div class="form-grid">
                  <div class="form-field">
                    <label class="form-label" for="provider-select">模型 Provider</label>
                    <select id="provider-select" v-model="selectedProvider" class="form-input">
                      <option v-for="option in providerOptions" :key="option.id" :value="option.id">
                        {{ option.label }}
                      </option>
                    </select>
                    <p class="form-hint">内置 provider 可直接选用，也支持自定义 provider id。</p>
                  </div>

                  <div v-if="selectedProvider === 'custom'" class="form-field">
                    <label class="form-label" for="provider-custom">自定义 provider id</label>
                    <input
                      id="provider-custom"
                      v-model="customProviderId"
                      class="form-input"
                      placeholder="例如：my-provider"
                    />
                    <p class="form-hint">仅支持字母、数字、点、下划线与中划线。</p>
                  </div>

                  <div class="form-field">
                    <label class="form-label" for="api-key">API Key</label>
                    <input
                      id="api-key"
                      v-model="apiKey"
                      class="form-input"
                      type="password"
                      placeholder="sk-..."
                      autocomplete="off"
                    />
                    <p class="form-hint">留空将清除已有 Key。</p>
                  </div>

                  <div class="form-field">
                    <label class="form-label" for="base-url">Base URL</label>
                    <input
                      id="base-url"
                      v-model="baseUrl"
                      class="form-input"
                      placeholder="https://api.example.com/v1"
                    />
                    <p class="form-hint">必填，用于代理或自建服务。</p>
                  </div>

                  <div class="form-field full">
                    <label class="form-label" for="default-model">默认模型</label>
                    <input
                      id="default-model"
                      v-model="defaultModel"
                      class="form-input"
                      placeholder="qwen2.5-72b-instruct"
                    />
                    <p class="form-hint">保存后会写入 agents.defaults.model.primary。</p>
                  </div>
                </div>

                <div class="action-row align-left">
                  <button class="btn primary" type="button" :disabled="saveDisabled" @click="saveModelConfig">
                    {{ modelSaveState === 'saving' ? '正在保存…' : '保存配置' }}
                  </button>
                  <button class="btn ghost" type="button" :disabled="modelSaveState === 'saving'" @click="loadModelConfig">
                    重新读取
                  </button>
                </div>

                <div v-if="modelLoadError" class="error-card">
                  <p class="error-title">读取失败</p>
                  <p class="error-detail">{{ modelLoadError }}</p>
                </div>

                <div v-if="modelSaveState === 'error' && modelSaveError" class="error-card">
                  <p class="error-title">保存失败</p>
                  <p class="error-detail">{{ modelSaveError }}</p>
                </div>

                <div v-if="modelSaveState === 'success'" class="success-card">
                  <div class="success-title">配置已保存</div>
                  <p class="success-note">已完成校验并写入 OpenClaw 配置。</p>
                </div>
              </div>
            </div>

            <div class="settings-card">
              <div class="settings-card-header">
                <div>
                  <h3>Qwen OAuth 授权</h3>
                  <p>通过官方授权流程获取访问权限。</p>
                </div>
              </div>
              <div class="action-row align-left">
                <button
                  class="btn primary"
                  type="button"
                  :disabled="qwenAuthState === 'running' || qwenSaveState === 'saving' || qwenSaveState === 'success'"
                  @click="handleQwenAction"
                >
                  {{
                    qwenAuthState === 'running'
                      ? '正在获取授权链接…'
                      : qwenAuthState === 'success'
                        ? qwenSaveState === 'saving'
                          ? '正在保存配置…'
                          : qwenSaveState === 'success'
                            ? '配置已保存'
                            : '已完成授权，保存配置'
                        : '开始授权'
                  }}
                </button>
              </div>

              <div v-if="qwenAuthState === 'running'" class="settings-progress">
                <div class="spinner" aria-hidden="true"></div>
                <p>正在拉起授权流程，请稍候…</p>
              </div>

              <div v-if="qwenSaveState === 'success'" class="success-card">
                <div class="success-title">配置已保存</div>
                <p class="success-note">已将 Qwen OAuth 作为默认模型配置写入。</p>
              </div>

              <div v-else-if="qwenAuthState === 'success'" class="success-card">
                <div class="success-title">授权完成待确认</div>
                <p class="success-note">{{ qwenAuthMessage }}</p>
                <div v-if="qwenCopyHintVisible && qwenAuthUrl" class="action-row align-left">
                  <button class="btn ghost" type="button" @click="copyQwenAuthUrl">
                    复制授权链接
                  </button>
                </div>
                <p v-if="qwenCopyHintVisible && qwenAuthUrl" class="form-hint">
                  若浏览器未自动打开，请复制链接手动打开。
                </p>
              </div>

              <div v-if="qwenSaveState === 'error' && qwenSaveMessage" class="error-card">
                <p class="error-title">保存失败</p>
                <p class="error-detail">{{ qwenSaveMessage }}</p>
              </div>

              <div v-else-if="qwenAuthState === 'error' && qwenAuthMessage" class="error-card">
                <p class="error-title">授权失败</p>
                <p class="error-detail">{{ qwenAuthMessage }}</p>
              </div>
            </div>

            <div class="panel-tip">
              <div class="panel-tip-title">安全提示</div>
              <ul class="panel-tip-list">
                <li>API Key 会以明文形式写入 openclaw.json，请妥善保管本机环境。</li>
                <li>保存配置后将执行 config validate，失败时不会清空表单内容。</li>
              </ul>
            </div>
          </div>

          <div v-show="activeSection === 'reset-config'" class="settings-section">
            <div class="settings-card">
              <div class="settings-card-header">
                <div>
                  <h3>重置配置文件</h3>
                  <p>恢复为默认配置并清理本地自定义项。</p>
                </div>
              </div>
              <p class="settings-placeholder">该功能正在开发中，敬请期待。</p>
              <div class="action-row align-left">
                <button class="btn ghost" type="button" disabled>即将上线</button>
              </div>
            </div>
          </div>

          <div v-show="activeSection === 'shutdown-restart'" class="settings-section">
            <div class="settings-card">
              <div class="settings-card-header">
                <div>
                  <h3>关闭重启</h3>
                  <p>快速关闭应用并重新启动相关服务。</p>
                </div>
              </div>
              <p class="settings-placeholder">该功能正在开发中，敬请期待。</p>
              <div class="action-row align-left">
                <button class="btn ghost" type="button" disabled>即将上线</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { openclawLogoUrl } from '../assets/branding'

type UninstallState = 'idle' | 'running' | 'success' | 'error'
type SaveState = 'idle' | 'saving' | 'success' | 'error'
type QwenAuthState = 'idle' | 'running' | 'success' | 'error'
type QwenSaveState = 'idle' | 'saving' | 'success' | 'error'

const openclaw = (window as any).openclaw

type SettingsSectionId = 'uninstall' | 'model-api' | 'reset-config' | 'shutdown-restart'

const uninstallState = ref<UninstallState>('idle')
const uninstallLogs = ref<string[]>([])
const uninstallError = ref<string | null>(null)
const confirming = ref(false)
const showManual = ref(false)
const activeSection = ref<SettingsSectionId>('uninstall')
const settingsItems = [
  { id: 'uninstall', label: 'openclaw 卸载', tone: 'danger' },
  { id: 'model-api', label: '模型API配置' },
  { id: 'reset-config', label: '重置配置文件' },
  { id: 'shutdown-restart', label: '关闭重启' }
]

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

const providerOptions = [
  { id: 'qwen', label: 'Qwen' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'moonshot', label: 'Moonshot' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'azure-openai', label: 'Azure OpenAI' },
  { id: 'custom', label: '自定义 provider' }
]

const defaultBaseUrls: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  deepseek: 'https://api.deepseek.com/v1',
  moonshot: 'https://api.moonshot.cn/v1',
  mistral: 'https://api.mistral.ai/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  qwen: 'https://portal.qwen.ai/v1',
  'qwen-portal': 'https://portal.qwen.ai/v1'
}

const selectedProvider = ref(providerOptions[0].id)
const customProviderId = ref('')
const apiKey = ref('')
const baseUrl = ref('')
const defaultModel = ref('')
const modelConfigLoading = ref(false)
const modelLoadError = ref<string | null>(null)
const modelSaveState = ref<SaveState>('idle')
const modelSaveError = ref<string | null>(null)
const qwenAuthState = ref<QwenAuthState>('idle')
const qwenAuthMessage = ref<string | null>(null)
const qwenAuthUrl = ref<string | null>(null)
const qwenCopyHintVisible = ref(false)
const qwenCopyTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const qwenSaveState = ref<QwenSaveState>('idle')
const qwenSaveMessage = ref<string | null>(null)
const baseUrlTouched = ref(false)
const baseUrlAutoUpdating = ref(false)
const lastAutoBaseUrl = ref('')

const effectiveProviderId = computed(() =>
  selectedProvider.value === 'custom' ? customProviderId.value.trim() : selectedProvider.value
)

const saveDisabled = computed(() => modelSaveState.value === 'saving' || modelConfigLoading.value)

const selectSection = (id: SettingsSectionId) => {
  activeSection.value = id
  confirming.value = false
  showManual.value = false
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

const applyModelConfig = (data: {
  providerId: string
  apiKey: string
  baseUrl: string
  defaultModel: string
}) => {
  const providerId = data.providerId?.trim()
  if (providerId && providerOptions.some(option => option.id === providerId)) {
    selectedProvider.value = providerId
    customProviderId.value = ''
  } else if (providerId) {
    selectedProvider.value = 'custom'
    customProviderId.value = providerId
  } else {
    selectedProvider.value = providerOptions[0].id
    customProviderId.value = ''
  }
  apiKey.value = data.apiKey ?? ''
  baseUrlAutoUpdating.value = true
  baseUrl.value = data.baseUrl ?? ''
  baseUrlAutoUpdating.value = false
  baseUrlTouched.value = Boolean(data.baseUrl)
  lastAutoBaseUrl.value = baseUrl.value
  defaultModel.value = data.defaultModel ?? ''
}

const loadModelConfig = async () => {
  if (!openclaw?.getModelConfig) {
    modelLoadError.value = '未检测到读取配置能力，请检查应用版本。'
    return
  }
  modelConfigLoading.value = true
  modelLoadError.value = null
  try {
    const result = await openclaw.getModelConfig()
    if (result?.ok && result.data) {
      applyModelConfig(result.data)
      modelSaveState.value = 'idle'
      modelSaveError.value = null
    } else {
      modelLoadError.value = result?.error || '读取配置失败，请稍后重试。'
    }
  } catch (error: any) {
    modelLoadError.value = error?.message || '读取配置失败，请稍后重试。'
  } finally {
    modelConfigLoading.value = false
  }
}

const saveModelConfig = async () => {
  if (!openclaw?.saveModelConfig) {
    modelSaveState.value = 'error'
    modelSaveError.value = '未检测到保存配置能力，请检查应用版本。'
    return
  }
  modelSaveState.value = 'saving'
  modelSaveError.value = null
  try {
    const result = await openclaw.saveModelConfig({
      providerId: effectiveProviderId.value,
      apiKey: apiKey.value,
      baseUrl: baseUrl.value,
      defaultModel: defaultModel.value
    })
    if (result?.ok) {
      modelSaveState.value = 'success'
      modelSaveError.value = null
      return
    }
    modelSaveState.value = 'error'
    modelSaveError.value = result?.error || '保存失败，请稍后重试。'
  } catch (error: any) {
    modelSaveState.value = 'error'
    modelSaveError.value = error?.message || '保存失败，请稍后重试。'
  }
}

const startQwenAuth = async () => {
  if (!openclaw?.startQwenAuth) {
    qwenAuthState.value = 'error'
    qwenAuthMessage.value = '未检测到授权能力，请检查应用版本。'
    return
  }
  qwenAuthState.value = 'running'
  qwenAuthMessage.value = null
  qwenAuthUrl.value = null
  qwenCopyHintVisible.value = false
  if (qwenCopyTimer.value) {
    clearTimeout(qwenCopyTimer.value)
    qwenCopyTimer.value = null
  }
  qwenSaveState.value = 'idle'
  qwenSaveMessage.value = null
  try {
    const result = await openclaw.startQwenAuth()
    if (result?.url || result?.opened) {
      qwenAuthState.value = 'success'
      qwenAuthUrl.value = result?.url || null
      qwenAuthMessage.value =
        '已获取授权链接。完成授权后请回到此处点击“已完成授权，保存配置”。'
      qwenCopyTimer.value = setTimeout(() => {
        if (qwenAuthState.value === 'success' && qwenAuthUrl.value) {
          qwenCopyHintVisible.value = true
        }
      }, 10000)
    } else {
      qwenAuthState.value = 'error'
      qwenAuthMessage.value = result?.error || '未能获取授权链接，请稍后重试。'
    }
  } catch (error: any) {
    qwenAuthState.value = 'error'
    qwenAuthMessage.value = error?.message || '授权启动失败，请稍后重试。'
  }
}

const copyQwenAuthUrl = async () => {
  if (!qwenAuthUrl.value) return
  try {
    await navigator.clipboard.writeText(qwenAuthUrl.value)
    qwenAuthMessage.value = '已复制授权链接，请粘贴到浏览器打开。'
  } catch {
    qwenAuthMessage.value = '复制失败，请手动选择链接。'
  }
}

const saveQwenConfig = async () => {
  if (!openclaw?.saveModelConfig) {
    qwenSaveState.value = 'error'
    qwenSaveMessage.value = '未检测到保存配置能力，请检查应用版本。'
    return
  }
  qwenSaveState.value = 'saving'
  qwenSaveMessage.value = null
  const shouldUseFormModel =
    selectedProvider.value === 'qwen' || effectiveProviderId.value === 'qwen-portal'
  const modelId = (shouldUseFormModel ? defaultModel.value : '').trim() || 'coder-model'

  try {
    const result = await openclaw.saveModelConfig({
      providerId: 'qwen-portal',
      apiKey: '',
      baseUrl: '',
      defaultModel: modelId
    })
    if (result?.ok) {
      qwenSaveState.value = 'success'
      await loadModelConfig()
      return
    }
    qwenSaveState.value = 'error'
    qwenSaveMessage.value = result?.error || '保存失败，请稍后重试。'
  } catch (error: any) {
    qwenSaveState.value = 'error'
    qwenSaveMessage.value = error?.message || '保存失败，请稍后重试。'
  }
}

const handleQwenAction = () => {
  if (qwenAuthState.value === 'success') {
    saveQwenConfig()
    return
  }
  startQwenAuth()
}

onMounted(() => {
  if (!openclaw?.onUninstallLog) return
  openclaw.onUninstallLog((msg: string) => {
    uninstallLogs.value.push(msg)
  })
})

watch([selectedProvider, customProviderId, apiKey, baseUrl, defaultModel], () => {
  if (modelSaveState.value !== 'saving') {
    if (modelSaveState.value !== 'idle') {
      modelSaveState.value = 'idle'
    }
    if (modelSaveError.value) {
      modelSaveError.value = null
    }
  }
})

watch([selectedProvider, customProviderId, defaultModel], () => {
  if (qwenSaveState.value !== 'idle') {
    qwenSaveState.value = 'idle'
    qwenSaveMessage.value = null
  }
})

watch(
  () => qwenAuthState.value,
  (state) => {
    if (state !== 'success' && qwenCopyTimer.value) {
      clearTimeout(qwenCopyTimer.value)
      qwenCopyTimer.value = null
      qwenCopyHintVisible.value = false
    }
  }
)

watch(
  baseUrl,
  (value) => {
    if (baseUrlAutoUpdating.value) return
    if (value !== lastAutoBaseUrl.value) {
      baseUrlTouched.value = true
    }
  }
)

watch(
  () => effectiveProviderId.value,
  (providerId) => {
    if (!providerId) return
    const candidate = defaultBaseUrls[providerId]
    if (!candidate) return
    const shouldApply =
      !baseUrlTouched.value || !baseUrl.value.trim() || baseUrl.value === lastAutoBaseUrl.value
    if (!shouldApply) return
    baseUrlAutoUpdating.value = true
    baseUrl.value = candidate
    baseUrlAutoUpdating.value = false
    lastAutoBaseUrl.value = candidate
    baseUrlTouched.value = false
  },
  { immediate: true }
)

onMounted(() => {
  loadModelConfig()
})
</script>
