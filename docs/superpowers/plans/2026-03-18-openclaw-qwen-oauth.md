# OpenClaw Qwen OAuth Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在安装完成后引导用户完成 Qwen OAuth 授权，并由用户手动启动 Gateway 进入控制台。

**Architecture:** 主进程负责安装、OAuth CLI 执行与流程编排；渲染进程负责三步 UI 展示与 WebView 授权页承载。新增 OAuth 输出解析器与授权流程模块，通过 IPC 推送授权 URL、user_code 与授权进度/错误。

**Tech Stack:** Electron 主进程、Vue 3 渲染进程、Vitest 单测、Node child_process。

---

## 进度
- [x] Task 1：OAuth 输出解析器
- [x] Task 2：OpenClaw 管理器 OAuth 流程
- [x] Task 3：命令白名单
- [x] Task 4：主进程流程拆分
- [x] Task 5：Preload 暴露新 API 与事件
- [x] Task 6：渲染进程 UI 三步改造
- [ ] Task 7：端到端手动验收（按你的要求先跳过）

## 文件结构（本次变更范围）
**新建**
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/oauthParser.ts`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/__tests__/oauthParser.test.ts`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/__tests__/openclawManager.test.ts`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/AuthView.vue`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/LaunchView.vue`

**修改**
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/index.ts`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/ipc.ts`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/preload/index.ts`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/openclawManager.ts`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/install/commandAllowlist.ts`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/install/__tests__/commandAllowlist.test.ts`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/App.vue`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/InstallView.vue`
- `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/styles/app.css`

---

### Task 1: 新增 OAuth 输出解析器（TDD）

**Files:**
- Create: `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/__tests__/oauthParser.test.ts`
- Create: `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/oauthParser.ts`

- [ ] **Step 1: 写失败测试（解析 URL 与 user_code，缺失字段视为错误；包含鲁棒性边界）**

```ts
import { describe, it, expect } from 'vitest'
import { parseOAuthOutput } from '../oauthParser'

describe('parseOAuthOutput', () => {
  it('extracts authorize url and user code from standard output', () => {
    const output = `\n◑  Starting Qwen OAuth…\n\n◇  Qwen OAuth ────────────────────────────────────────────────────────────╮\n│  Open https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code to\n│  approve access.\n│  If prompted, enter the code Y0-LDRXQ.\n╰──────────────────────────────────────────────────────────────────────────╯\n`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code')
    expect(result.userCode).toBe('Y0-LDRXQ')
    expect(result.error).toBeNull()
  })

  it('returns error when fields are missing', () => {
    const output = `Qwen OAuth complete`
    const result = parseOAuthOutput(output)
    expect(result.url).toBeNull()
    expect(result.userCode).toBeNull()
    expect(result.error).toBe('MISSING_FIELDS')
  })

  it('handles url split across lines', () => {
    const output = `Open https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&\nclient=qwen-code`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code')
    expect(result.userCode).toBe('Y0-LDRXQ')
  })

  it('trims trailing punctuation in url', () => {
    const output = `Open https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code.`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code')
  })

  it('falls back to text-only code when url has no user_code', () => {
    const output = `Open https://chat.qwen.ai/authorize?client=qwen-code\nYour code is QW-8899.`
    const result = parseOAuthOutput(output)
    expect(result.userCode).toBe('QW-8899')
    expect(result.error).toBeNull()
  })

  it('does not append plain text after question mark', () => {
    const output = `Open https://chat.qwen.ai/authorize?\nto approve access.`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize')
    expect(result.error).toBe('MISSING_FIELDS')
  })

  it('prefers authorize url when multiple urls exist', () => {
    const output = `Open https://example.com/help\nOpen https://chat.qwen.ai/authorize?user_code=QW-123&client=qwen-code`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=QW-123&client=qwen-code')
    expect(result.userCode).toBe('QW-123')
  })

  it('trims trailing bracket characters in url', () => {
    const output = `Open https://chat.qwen.ai/authorize?user_code=QW-123&client=qwen-code)`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=QW-123&client=qwen-code')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- --run src/main/openclaw/__tests__/oauthParser.test.ts`
Expected: FAIL with "Cannot find module '../oauthParser'" or missing exports

- [ ] **Step 3: 编写最小实现（含鲁棒解析）**

```ts
export function parseOAuthOutput(output: string): {
  url: string | null
  userCode: string | null
  error: string | null
} {
  const lines = output
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*[◇│◑]+/, '').trim())
    .filter(Boolean)

  const extractUrl = () => {
    const findUrl = (pattern: RegExp) => {
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]
        const match = line.match(pattern)
        if (!match) continue
        let url = match[0].replace(/[).,;:!?\]\}]+$/, '')
        if ((url.endsWith('?') || url.endsWith('&')) && i + 1 < lines.length) {
          const next = lines[i + 1].split(/\s+/)[0]
          if (/^[?&]/.test(next) || next.includes('=')) {
            url = `${url}${next}`
          }
        }
        return url.replace(/[).,;:!?\]\}]+$/, '')
      }
      return null
    }

    return findUrl(/https?:\/\/\S*authorize\S*/) ?? findUrl(/https?:\/\/\S+/)
  }

  const extractCode = (text: string) => {
    const match = text.match(/\bcode\b\s*(?:is|:)?\s*([A-Z0-9-]+)/i)
    return match ? match[1] : null
  }

  const url = extractUrl()
  let userCode: string | null = null

  if (url) {
    try {
      const parsed = new URL(url)
      const fromQuery = parsed.searchParams.get('user_code')
      if (fromQuery) userCode = fromQuery
    } catch {}
  }

  if (!userCode) {
    for (const line of lines) {
      const code = extractCode(line)
      if (code) {
        userCode = code
        break
      }
    }
  }

  const error = url && userCode ? null : 'MISSING_FIELDS'
  return { url, userCode, error }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- --run src/main/openclaw/__tests__/oauthParser.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add /Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/__tests__/oauthParser.test.ts \
        /Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/oauthParser.ts
git commit -m "test: add oauth output parser"
```

---

### Task 2: 扩展 OpenClaw 管理器以支持 OAuth 流程（TDD）

**Files:**
- Create: `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/__tests__/openclawManager.test.ts`
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/openclawManager.ts`

- [ ] **Step 1: 写失败测试（验证回调被触发并携带解析结果）**

```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('node:child_process', () => {
  const listeners: Record<string, (chunk: Buffer) => void> = {}
  return {
    spawn: () => ({
      stdout: { on: (event: string, cb: (chunk: Buffer) => void) => { listeners[`stdout:${event}`] = cb } },
      stderr: { on: (event: string, cb: (chunk: Buffer) => void) => { listeners[`stderr:${event}`] = cb } },
      _emit: (type: 'stdout' | 'stderr', data: string) => {
        listeners[`${type}:data`]?.(Buffer.from(data))
      }
    })
  }
})

import { startOAuthFlow } from '../openclawManager'

describe('startOAuthFlow', () => {
  it('invokes onUpdate with parsed url and userCode', () => {
    const updates: any[] = []
    const proc: any = startOAuthFlow((payload) => updates.push(payload))
    proc._emit('stdout', 'Open https://chat.qwen.ai/authorize?user_code=TEST&client=qwen-code')
    proc._emit('stdout', 'If prompted, enter the code TEST.')
    expect(updates.at(-1).url).toContain('https://chat.qwen.ai/authorize?user_code=TEST')
    expect(updates.at(-1).userCode).toBe('TEST')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- --run src/main/openclaw/__tests__/openclawManager.test.ts`
Expected: FAIL with "startOAuthFlow is not a function"

- [ ] **Step 3: 实现 startOAuthFlow（spawn + stdout/stderr 流式回调）**

```ts
import { spawn } from 'node:child_process'
import { parseOAuthOutput } from './oauthParser'

export function startOAuthFlow(
  onUpdate: (data: { url: string | null; userCode: string | null; error: string | null; chunk: string }) => void
) {
  const proc = spawn('openclaw', ['models', 'auth', 'login', '--provider', 'qwen'], { stdio: 'pipe' })
  let buffer = ''

  const handleChunk = (text: string) => {
    buffer += text
    const parsed = parseOAuthOutput(buffer)
    onUpdate({ ...parsed, chunk: text })
  }

  proc.stdout?.on('data', (chunk) => handleChunk(chunk.toString()))
  proc.stderr?.on('data', (chunk) => handleChunk(chunk.toString()))

  return proc
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- --run src/main/openclaw/__tests__/openclawManager.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add /Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/openclawManager.ts \
        /Users/yunchuchu/workSpace/project/openclawPilot/src/main/openclaw/__tests__/openclawManager.test.ts
git commit -m "feat: add qwen oauth flow runner"
```

---

### Task 3: 更新命令白名单（TDD）

**Files:**
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/install/commandAllowlist.ts`
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/install/__tests__/commandAllowlist.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest'
import { assertAllowedCommand } from '../commandAllowlist'

describe('commandAllowlist', () => {
  it('allows openclaw oauth login command', () => {
    expect(() => assertAllowedCommand('openclaw models auth login --provider qwen')).not.toThrow()
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- --run src/main/install/__tests__/commandAllowlist.test.ts`
Expected: FAIL with "Disallowed command"

- [ ] **Step 3: 增加允许项**

```ts
  'openclaw models auth login --provider qwen',
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test -- --run src/main/install/__tests__/commandAllowlist.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add /Users/yunchuchu/workSpace/project/openclawPilot/src/main/install/commandAllowlist.ts \
        /Users/yunchuchu/workSpace/project/openclawPilot/src/main/install/__tests__/commandAllowlist.test.ts
git commit -m "test: allow openclaw oauth command"
```

---

### Task 4: 主进程流程拆分为“安装 / 授权 / 启动”

**Files:**
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/index.ts`
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/main/ipc.ts`

- [ ] **Step 1: 为新 IPC 事件写接口变更（类型层）**

```ts
export function registerIpcHandlers(handlers: {
  startInstall: () => Promise<void>
  retryInstall: () => Promise<void>
  startAuth: () => Promise<void>
  startGateway: () => Promise<void>
  getLogs: () => string[]
}) {
  ipcMain.handle('installer:start', handlers.startInstall)
  ipcMain.handle('installer:retry', handlers.retryInstall)
  ipcMain.handle('auth:start', handlers.startAuth)
  ipcMain.handle('gateway:start', handlers.startGateway)
  ipcMain.handle('installer:getLogs', handlers.getLogs)
}
```

- [ ] **Step 2: 拆分 runInstallFlow，仅完成安装并发 `installer:done`**

```ts
emitStep(win, 'Installing OpenClaw')
await installOpenClawGlobal(exec, (key, value) => {
  process.env[key] = value
})
// ...refresh PATH
win.webContents.send('installer:done')
```

- [ ] **Step 3: 新增 runAuthFlow（使用 startOAuthFlow，统一事件名为 auth:progress）**

```ts
let lastParsed = { url: null as string | null, userCode: null as string | null, error: 'MISSING_FIELDS' }
const authProc = startOAuthFlow(({ url, userCode, error, chunk }) => {
  if (chunk) emitLog(win, chunk)
  lastParsed = { url, userCode, error }
  win.webContents.send('auth:progress', { url, userCode, message: chunk })
})

supervisor.track(authProc)

await new Promise<void>((resolve, reject) => {
  authProc.on('exit', (code) => {
    if (code === 0) {
      if (lastParsed.error) {
        const payload = { code: 'AUTH_PARSE_FAILED', message: '未获取到授权链接，请重试。' }
        emitError(win, payload.code, payload.message)
        win.webContents.send('auth:error', payload)
        reject(new Error('Auth parse failed'))
        return
      }
      win.webContents.send('auth:done')
      resolve()
    } else {
      const payload = { code: 'AUTH_FAILED', message: 'Qwen OAuth failed.' }
      emitError(win, payload.code, payload.message)
      win.webContents.send('auth:error', payload)
      reject(new Error('Auth failed'))
    }
  })
})
```

- [ ] **Step 4: 新增 runGatewayFlow，手动触发后才启动**

```ts
emitStep(win, 'Starting Gateway')
const gateway = await startGateway()
supervisor.track(gateway)
// ...日志回传
emitStep(win, 'Fetching Dashboard URL')
currentDashboardUrl = await getDashboardUrl(exec)
win.webContents.send('gateway:ready', { dashboardUrl: currentDashboardUrl })
```

- [ ] **Step 5: 更新 IPC 绑定与流程调用（统一命名 runAuthFlow）**

```ts
registerIpcHandlers({
  startInstall: async () => runInstallFlow(win),
  retryInstall: async () => runInstallFlow(win),
  startAuth: async () => runAuthFlow(win),
  startGateway: async () => runGatewayFlow(win),
  getLogs
})
```

- [ ] **Step 6: 手动验证（无自动化测试）**

Run: `npm run dev`
Expected: 安装完成后停在授权页；授权完成后需点击“启动控制台”才进入 Dashboard

- [ ] **Step 7: 提交**

```bash
git add /Users/yunchuchu/workSpace/project/openclawPilot/src/main/index.ts \
        /Users/yunchuchu/workSpace/project/openclawPilot/src/main/ipc.ts
git commit -m "feat: split install/auth/gateway flows"
```

---

### Task 5: Preload 暴露新 API 与事件

**Files:**
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/preload/index.ts`

- [ ] **Step 1: 增加授权与启动控制台 API**

```ts
startAuth: () => ipcRenderer.invoke('auth:start'),
startGateway: () => ipcRenderer.invoke('gateway:start'),
onAuthProgress: (cb: (payload: { url: string | null; userCode: string | null; message: string }) => void) =>
  ipcRenderer.on('auth:progress', (_, payload) => cb(payload)),
onAuthDone: (cb: () => void) => ipcRenderer.on('auth:done', () => cb()),
onAuthError: (cb: (payload: { code: string; message: string }) => void) =>
  ipcRenderer.on('auth:error', (_, payload) => cb(payload)),
onGatewayReady: (cb: (payload: { dashboardUrl: string }) => void) =>
  ipcRenderer.on('gateway:ready', (_, payload) => cb(payload)),
```

- [ ] **Step 2: 运行手动检查（无自动化测试）**

Run: `npm run dev`
Expected: Renderer 可调用新 API 且不报错

- [ ] **Step 3: 提交**

```bash
git add /Users/yunchuchu/workSpace/project/openclawPilot/src/preload/index.ts
git commit -m "feat: expose auth and gateway ipc"
```

---

### Task 6: 渲染进程 UI 三步改造

**Files:**
- Create: `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/AuthView.vue`
- Create: `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/LaunchView.vue`
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/App.vue`
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/InstallView.vue`
- Modify: `/Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/styles/app.css`

- [ ] **Step 1: 新增 AuthView 组件（含日志与错误重试）**

```vue
<template>
  <section class="install-card">
    <header class="install-header">
      <div class="brand">
        <div class="brand-mark">OC</div>
        <div>
          <h1>OpenClaw</h1>
          <p>Model API 配置</p>
        </div>
      </div>
      <div class="status-pill">Qwen OAuth</div>
    </header>

    <div class="auth-body">
      <button class="primary" :disabled="running" @click="emit('start-auth')">
        {{ running ? '正在授权…' : '开始授权' }}
      </button>

      <div v-if="url" class="auth-frame">
        <webview
          :src="url"
          class="auth-webview"
          webpreferences="contextIsolation=yes, nodeIntegration=no"
        />
      </div>

      <div v-if="userCode" class="auth-code">
        授权码：<strong>{{ userCode }}</strong>
      </div>

      <div class="log-summary">
        <p v-for="(line, index) in logSummary" :key="`${line}-${index}`">{{ line }}</p>
        <p v-if="!logSummary.length" class="log-placeholder">授权日志会显示在这里。</p>
      </div>

      <p v-if="error" class="auth-error">{{ error.message }}</p>
      <p v-else-if="done" class="auth-success">授权成功，请点击继续。</p>

      <div v-if="error" class="actions">
        <button class="primary" @click="emit('retry-auth')">重试授权</button>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 2: 新增 LaunchView 组件**

```vue
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
  </section>
</template>
```

- [ ] **Step 3: 更新 App.vue 状态机（统一 auth:progress / auth:error）**

```ts
const stage = ref<'install' | 'auth' | 'launch' | 'dashboard'>('install')
const authUrl = ref<string | null>(null)
const authCode = ref<string | null>(null)
const authDone = ref(false)
const authError = ref<{ code: string; message: string } | null>(null)

openclaw.onInstallDone?.(() => { stage.value = 'auth' })
openclaw.onAuthProgress?.((payload) => {
  authUrl.value = payload.url
  authCode.value = payload.userCode
  if (payload.message) logs.value.push(payload.message.trim())
})
openclaw.onAuthError?.((payload) => { authError.value = payload })
openclaw.onAuthDone?.(() => { authDone.value = true; stage.value = 'launch' })
openclaw.onGatewayReady?.((payload) => { dashboardUrl.value = payload.dashboardUrl; stage.value = 'dashboard' })

const startAuth = async () => {
  authError.value = null
  authDone.value = false
  logs.value = []
  await openclaw.startAuth()
}
```

- [ ] **Step 4: 更新 InstallView 文案与按钮（安装完成后不自动启动）**

```vue
<button class="primary" @click="emit('start')" :disabled="started">
  {{ started ? '安装中…' : '开始安装' }}
</button>
```

- [ ] **Step 5: 更新样式**

```css
.auth-frame { margin-top: 16px; border: 1px solid var(--stroke); border-radius: 18px; overflow: hidden; height: 420px; }
.auth-webview { width: 100%; height: 100%; }
.auth-code { margin-top: 12px; font-weight: 600; }
.auth-success { margin-top: 12px; color: var(--teal); }
.auth-error { margin-top: 12px; color: #b3261e; font-weight: 600; }
```

- [ ] **Step 6: 手动验证（无自动化测试）**

Run: `npm run dev`
Expected: 三步流程依次显示；授权完成后必须点击“启动控制台”才进入 Dashboard

- [ ] **Step 7: 提交**

```bash
git add /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/AuthView.vue \
        /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/LaunchView.vue \
        /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/App.vue \
        /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/components/InstallView.vue \
        /Users/yunchuchu/workSpace/project/openclawPilot/src/renderer/src/styles/app.css
git commit -m "feat: add auth and launch steps"
```

---

### Task 7: 端到端手动验收

**Files:**
- None

- [ ] **Step 1: 启动开发环境**

Run: `npm run dev`
Expected: 可进入安装页

- [ ] **Step 2: 完整走通三步**

Expected:
1. 安装完成后停留在“配置 Model API”
2. Qwen OAuth WebView 正常加载并显示 user code
3. 授权失败时可显示错误并重试
4. 授权完成后出现“启动控制台”按钮
5. 点击后进入 Dashboard

- [ ] **Step 3: 提交（若无新增代码变更可跳过）**

```bash
git status --short
```

---

## 注意事项
- OAuth CLI 命令假定为：`openclaw models auth login --provider qwen`，如 CLI 实际命令不同需同步调整。
- WebView 授权页面显式禁用 NodeIntegration，仅加载 OAuth URL。
