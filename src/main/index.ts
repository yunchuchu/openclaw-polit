import { app, BrowserWindow, nativeImage, shell } from 'electron'
import os from 'node:os'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { registerIpcHandlers } from './ipc'
import { emitError, emitLog, emitStep, execCommand, getLogs } from './logging'
import { ProcessSupervisor } from './processSupervisor'
import { detectEnv } from './env/envDetector'
import { fetchNodeIndex } from './env/nodeIndexClient'
import { isInstalledLts, isMajorAtLeast, selectLatestLts } from './env/nodeLts'
import { buildGitInstallCommand, buildNodeInstallCommand } from './install/packageManager'
import { assertAllowedUrl } from './install/allowlist'
import {
  installGitPortable,
  installNodeMsi,
  installNodePkg,
  PERMISSION_DENIED,
  resolveNodeInstallerUrl
} from './install/installer'
import { ensureWindowsNpmPath, installOpenClawGlobal } from './openclaw/npmGlobal'
import { getDashboardUrl, hasDashboardToken, startGateway, startOAuthFlow } from './openclaw/openclawManager'

const supervisor = new ProcessSupervisor()
let currentDashboardUrl: string | null = null

type ExecResult = { stdout: string; stderr: string; code: number }
type PluginList = {
  plugins?: Array<{
    id?: string
    name?: string
    enabled?: boolean
    providerIds?: string[]
  }>
}
type ModelConfigPayload = {
  providerId: string
  apiKey: string
  baseUrl: string
  defaultModel: string
}

type ExecFn = (cmd: string) => Promise<ExecResult>

const makeTokenError = (code: string, message: string) => {
  const error = new Error(message) as Error & { code?: string }
  error.code = code
  return error
}

function resolvePortableGitArchive() {
  const filename = 'PortableGit-2.53.0.2-64-bit.7z.exe'
  if (app.isPackaged) {
    return join(process.resourcesPath, 'portable-git', 'windows', filename)
  }
  return join(app.getAppPath(), 'resources', 'portable-git', 'windows', filename)
}

async function resolveDashboardUrlWithToken(exec: ExecFn, win?: BrowserWindow) {
  let dashboardUrl: string
  try {
    if (win) emitStep(win, 'Fetching Dashboard URL')
    dashboardUrl = await getDashboardUrl(exec)
  } catch (error: any) {
    throw makeTokenError('DASHBOARD_URL_MISSING', error?.message || '未获取到控制台地址，请先完成授权。')
  }

  if (hasDashboardToken(dashboardUrl)) {
    return { dashboardUrl, generated: false }
  }

  if (win) emitStep(win, 'Generating Gateway Token')
  const generateResult = await exec('openclaw doctor --generate-gateway-token')
  if (generateResult.code !== 0) {
    const reason = generateResult.stderr || generateResult.stdout || '生成 token 失败。'
    throw makeTokenError('TOKEN_GENERATE_FAILED', reason)
  }

  try {
    if (win) emitStep(win, 'Fetching Dashboard URL')
    dashboardUrl = await getDashboardUrl(exec)
  } catch (error: any) {
    throw makeTokenError('DASHBOARD_URL_MISSING', error?.message || '未获取到控制台地址，请先完成授权。')
  }

  if (!hasDashboardToken(dashboardUrl)) {
    throw makeTokenError('TOKEN_MISSING', '未检测到控制台 token，请先完成授权。')
  }

  return { dashboardUrl, generated: true }
}

async function ensureGatewayMode(exec: ExecFn, win?: BrowserWindow) {
  if (win) emitStep(win, 'Ensuring Gateway Mode')
  const result = await exec('openclaw config get gateway.mode --json')
  if (result.code === 0) {
    try {
      const value = JSON.parse(result.stdout)
      if (typeof value === 'string' && value.trim()) {
        return { ok: true as const, updated: false as const, value }
      }
    } catch {
      // ignore parse error and treat as missing
    }
  } else {
    const message = (result.stderr || result.stdout || '').toLowerCase()
    if (message && !message.includes('config path not found') && !message.includes('not found')) {
      throw makeTokenError('GATEWAY_MODE_FAILED', result.stderr || result.stdout || '读取 gateway.mode 失败。')
    }
  }

  const setResult = await exec('openclaw config set gateway.mode local')
  if (setResult.code !== 0) {
    throw makeTokenError('GATEWAY_MODE_FAILED', setResult.stderr || setResult.stdout || '设置 gateway.mode 失败。')
  }
  return { ok: true as const, updated: true as const, value: 'local' }
}

function resolveAppIconPath() {
  const devBase = app.getAppPath()
  const prodBase = process.resourcesPath
  const devCandidates = [
    join(devBase, 'resources', 'images', 'logo.png'),
    join(devBase, 'resources', 'images', 'logo.svg'),
    join(devBase, 'src', 'renderer', 'src', 'assets', 'logo.png'),
    join(devBase, 'src', 'renderer', 'src', 'assets', 'logo.svg')
  ]
  const prodCandidates = [
    join(prodBase, 'images', 'logo.png'),
    join(prodBase, 'images', 'logo.svg')
  ]
  const candidates = app.isPackaged ? prodCandidates : devCandidates
  return candidates.find(path => existsSync(path))
}

function getPortableGitInstallDir() {
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
  return join(programFiles, 'OpenClaw', 'PortableGit')
}

function getLtsMajor(version: string) {
  const cleaned = version.replace(/^v/, '')
  return Number(cleaned.split('.')[0])
}

function shellEscape(value: string) {
  const escaped = value.replace(/(["\\$`])/g, '\\$1').replace(/\r?\n/g, ' ')
  return `"${escaped}"`
}

function parsePrimaryModel(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return { providerId: '', model: '' }
  const [providerId, ...rest] = value.split('/')
  return { providerId: providerId ?? '', model: rest.join('/') }
}

function pickProviderId(primaryProvider: string, providers: Record<string, any>) {
  if (primaryProvider) return primaryProvider
  const keys = Object.keys(providers ?? {})
  return keys[0] ?? ''
}

function resolveProviderApi(providerId: string) {
  const normalized = providerId.toLowerCase()
  if (normalized === 'anthropic') return 'anthropic-messages'
  if (normalized === 'gemini' || normalized === 'google-gemini' || normalized === 'google') {
    return 'google-generative-ai'
  }
  return 'openai-completions'
}

function resolveDefaultBaseUrl(providerId: string) {
  const normalized = providerId.toLowerCase()
  const defaults: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
    deepseek: 'https://api.deepseek.com/v1',
    moonshot: 'https://api.moonshot.cn/v1',
    mistral: 'https://api.mistral.ai/v1',
    gemini: 'https://generativelanguage.googleapis.com/v1beta',
    qwen: 'https://portal.qwen.ai/v1',
    'qwen-portal': 'https://portal.qwen.ai/v1'
  }
  return defaults[normalized] ?? ''
}

async function refreshPath(platform: NodeJS.Platform, exec: ExecFn) {
  if (platform === 'win32') {
    const machine = (await exec('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\\"PATH\\",\\"Machine\\")"')).stdout.trim()
    const user = (await exec('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\\"PATH\\",\\"User\\")"')).stdout.trim()
    const combined = [machine, user, process.env.PATH].filter(Boolean).join(';')
    if (combined) process.env.PATH = combined
    return
  }

  if (platform === 'darwin') {
    const extras = ['/usr/local/bin', '/opt/homebrew/bin']
    const parts = (process.env.PATH || '').split(':').filter(Boolean)
    for (const extra of [...extras].reverse()) {
      if (!parts.includes(extra)) {
        parts.unshift(extra)
      }
    }
    process.env.PATH = parts.join(':')
  }
}

async function runInstallFlow(win: BrowserWindow) {
  const exec = (cmd: string) => execCommand(cmd, win)
  const tempDir = app.getPath('temp')
  const tempFiles: string[] = []
  const platform = process.platform
  let emittedError = false

  if (platform !== 'win32' && platform !== 'darwin') {
    emitError(win, 'UNSUPPORTED_PLATFORM', 'This installer supports only Windows and macOS.')
    throw new Error('Unsupported platform')
  }

  try {
    emitStep(win, 'Checking environment')
    let env = await detectEnv(exec, platform)

    emitStep(win, 'Resolving Node.js LTS')
    const nodeIndex = await fetchNodeIndex(fetch, assertAllowedUrl)
    const latestLts = selectLatestLts(nodeIndex)
    const ltsMajor = getLtsMajor(latestLts.version)
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64'

    const nodeVersion = env.node.version || ''
    const nodeIsLts = nodeVersion ? isInstalledLts(nodeVersion, nodeIndex) : false
    const nodeIsMajorOk = nodeVersion ? isMajorAtLeast(nodeVersion, 22) : false
    const needsNode = !env.node.available || !nodeIsLts || !nodeIsMajorOk

    if (needsNode) {
      emitStep(win, 'Installing Node.js')
      let installed = false

      if (platform === 'win32' && env.managers.winget) {
        emitLog(win, 'Using winget for Node.js...')
        const result = await exec(buildNodeInstallCommand('win32', 'winget', ltsMajor))
        installed = result.code === 0
      }

      if (platform === 'darwin' && env.managers.brew) {
        emitLog(win, 'Using Homebrew for Node.js...')
        const result = await exec(buildNodeInstallCommand('darwin', 'brew', ltsMajor))
        installed = result.code === 0
      }

      if (!installed) {
        emitLog(win, 'Downloading Node.js installer...')
        const nodeUrl = resolveNodeInstallerUrl(latestLts.version, platform, arch)
        const installerPath = join(
          tempDir,
          platform === 'win32'
            ? `node-${latestLts.version}-${arch}.msi`
            : `node-${latestLts.version}.pkg`
        )
        tempFiles.push(installerPath)

        try {
          if (platform === 'win32') {
            await installNodeMsi(nodeUrl, installerPath)
          } else {
            await installNodePkg(nodeUrl, installerPath)
          }
        } catch (error) {
          emitError(win, 'NODE_INSTALL_FAILED', 'Failed to install Node.js.')
          emittedError = true
          throw error
        }
      }
    }

    if (!env.git.available) {
      emitStep(win, 'Installing Git')
      let installed = false

      if (platform === 'win32' && env.managers.winget) {
        emitLog(win, 'Using winget for Git...')
        const result = await exec(buildGitInstallCommand('win32', 'winget'))
        installed = result.code === 0
      }

      if (platform === 'darwin' && env.managers.brew) {
        emitLog(win, 'Using Homebrew for Git...')
        const result = await exec(buildGitInstallCommand('darwin', 'brew'))
        installed = result.code === 0
      }

      if (!installed) {
        if (platform === 'win32') {
          emitLog(win, 'Using PortableGit fallback...')
          const archivePath = resolvePortableGitArchive()
          const destDir = getPortableGitInstallDir()
          try {
            await installGitPortable(archivePath, destDir, process.env.PATH || '')
          } catch (error) {
            emitError(win, 'GIT_INSTALL_FAILED', 'Failed to install Git.')
            emittedError = true
            throw error
          }
        } else {
          emitError(win, 'GIT_INSTALL_FAILED', 'Git not detected and Homebrew is unavailable.')
          emittedError = true
          throw new Error('Git install failed')
        }
      }
    }

    await refreshPath(platform, exec)
    env = await detectEnv(exec, platform)

    if (!env.node.available || !env.git.available) {
      emitError(win, 'ENV_CHECK_FAILED', 'Node.js or Git is still missing after install.')
      emittedError = true
      throw new Error('Environment check failed')
    }

    emitStep(win, 'Installing OpenClaw')
    if (platform === 'win32') {
      await ensureWindowsNpmPath(exec)
    }
    await installOpenClawGlobal(exec, (key, value) => {
      process.env[key] = value
    })

    if (platform === 'win32') {
      const appData = process.env.APPDATA || ''
      const npmPath = `${appData}\\npm`
      if (npmPath && !process.env.PATH?.includes(npmPath)) {
        process.env.PATH = `${npmPath};${process.env.PATH || ''}`
      }
    }

    await refreshPath(platform, exec)

    try {
      const modeResult = await ensureGatewayMode(exec, win)
      if (modeResult.updated) {
        emitLog(win, '已自动设置 gateway.mode=local')
      }
    } catch (error: any) {
      emitLog(win, error?.message || '自动设置 gateway.mode 失败，请手动配置。')
    }

    // 安装完成后不自动启动 Gateway，由用户手动触发后续授权/启动流程
    win.webContents.send('installer:done')
  } catch (error: any) {
    if (error?.code === PERMISSION_DENIED) {
      emitError(win, PERMISSION_DENIED, 'Administrator authorization is required to continue.')
      emittedError = true
    }

    if (!emittedError) {
      emitError(win, 'INSTALL_FAILED', error?.message || 'Install failed.')
    }

    throw error
  } finally {
    await Promise.all(tempFiles.map((file) => fs.unlink(file).catch(() => {})))
  }
}

async function runStartupBootstrap(win: BrowserWindow) {
  const exec = (cmd: string) => execCommand(cmd, win)
  const versionResult = await exec('openclaw -v')
  if (versionResult.code !== 0) {
    return { installed: false as const, tokenReady: false as const }
  }

  let dashboardUrl: string
  try {
    await ensureGatewayMode(exec, win)
    const result = await resolveDashboardUrlWithToken(exec, win)
    dashboardUrl = result.dashboardUrl
  } catch (error: any) {
    return {
      installed: true as const,
      tokenReady: false as const,
      error: {
        code: error?.code || 'TOKEN_MISSING',
        message: error?.message || '未检测到控制台 token，请先完成授权。'
      }
    }
  }

  try {
    emitStep(win, 'Starting Gateway')
    const gateway = await startGateway()
    supervisor.track(gateway)
    gateway.stdout?.on('data', (chunk) => emitLog(win, chunk.toString()))
    gateway.stderr?.on('data', (chunk) => emitLog(win, chunk.toString()))

    currentDashboardUrl = dashboardUrl
    return { installed: true as const, tokenReady: true as const, dashboardUrl }
  } catch (error: any) {
    return {
      installed: true as const,
      tokenReady: true as const,
      error: {
        code: 'GATEWAY_BOOTSTRAP_FAILED',
        message: error?.message || 'Failed to start gateway.'
      }
    }
  }
}

async function runAuthFlow(win: BrowserWindow) {
  emitStep(win, 'Starting Qwen OAuth')
  const provider = await ensureQwenProvider(win)

  let lastParsed = {
    url: null as string | null,
    userCode: null as string | null,
    error: 'MISSING_FIELDS' as string | null
  }

  const authProc = startOAuthFlow(provider, ({ url, userCode, error, chunk }) => {
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
}

async function runExternalAuthFlow(
  win: BrowserWindow,
  options: { autoOpen?: boolean; autoOpenFallbackMs?: number } = {}
) {
  emitStep(win, 'Starting Qwen OAuth')
  const provider = await ensureQwenProvider(win)
  let opened = false
  let resolved = false
  let capturedUrl: string | null = null
  let errorMessage: string | null = null
  let outputBuffer = ''
  const autoOpen = options.autoOpen ?? true
  const fallbackMs = options.autoOpenFallbackMs ?? 10000
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null

  return new Promise<{ opened: boolean; url: string | null; error?: string }>((resolve) => {
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve({ opened: false, url: null, error: errorMessage ?? '未能获取授权链接，请稍后重试。' })
      }
    }, 20000)

    const authProc = startOAuthFlow(provider, ({ url, chunk }) => {
      if (chunk) emitLog(win, chunk)
      if (chunk) {
        outputBuffer += chunk
        if (/unknown provider/i.test(outputBuffer)) {
          errorMessage = '当前 OpenClaw 未启用 Qwen 插件，已自动尝试启用但未成功。'
        }
      }
      if (!opened && url) {
        opened = autoOpen
        capturedUrl = url
        if (autoOpen) {
          shell.openExternal(url)
        }
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          resolve({ opened: true, url })
        }
        if (fallbackTimer) {
          clearTimeout(fallbackTimer)
          fallbackTimer = null
        }
      }
    })

    supervisor.track(authProc)

    fallbackTimer = setTimeout(() => {
      if (!opened && !resolved) {
        win.webContents.send('auth:progress', {
          url: null,
          userCode: null,
          message: '若未自动打开浏览器，请手动复制授权链接或重试。'
        })
      }
    }, fallbackMs)

    authProc.on('exit', () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        resolve({ opened, url: capturedUrl, error: errorMessage ?? undefined })
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer)
        fallbackTimer = null
      }
    })
  })
}

async function ensureQwenProvider(win: BrowserWindow) {
  emitLog(win, '正在检测 OpenClaw CLI 与 Qwen 插件...')
  const versionResult = await execCommand('openclaw -v')
  if (versionResult.code !== 0) {
    throw new Error('未检测到 openclaw 命令，请先完成安装。')
  }

  const listResult = await execCommand('openclaw plugins list --json')
  if (listResult.code !== 0 || !listResult.stdout) {
    throw new Error('读取插件列表失败，请检查 OpenClaw 安装。')
  }

  let payload: PluginList | null = null
  try {
    payload = JSON.parse(listResult.stdout) as PluginList
  } catch (error: any) {
    throw new Error('插件列表解析失败，请稍后重试。')
  }

  const plugins = payload.plugins ?? []
  const matchPlugin = (list: typeof plugins) =>
    list.find(plugin => plugin.id === 'qwen-portal-auth') ??
    list.find(plugin => plugin.id?.toLowerCase().includes('qwen')) ??
    list.find(plugin => plugin.name?.toLowerCase().includes('qwen')) ??
    null

  let plugin = matchPlugin(plugins)
  if (!plugin) {
    throw new Error('当前安装未包含 Qwen 插件，请确认 OpenClaw 版本。')
  }

  if (!plugin.enabled) {
    emitLog(win, '检测到 Qwen 插件未启用，正在自动启用...')
    const enableResult = await execCommand(`openclaw plugins enable ${plugin.id}`)
    if (enableResult.code !== 0) {
      const reason = enableResult.stderr || enableResult.stdout || '未知错误'
      throw new Error(`启用 Qwen 插件失败：${reason}`)
    }

    const refresh = await execCommand('openclaw plugins list --json')
    if (refresh.code === 0 && refresh.stdout) {
      try {
        payload = JSON.parse(refresh.stdout) as PluginList
        plugin = matchPlugin(payload.plugins ?? []) ?? plugin
      } catch {
        // ignore parse error, keep previous plugin info
      }
    }
  }

  const providerId = plugin.providerIds?.[0] || 'qwen'
  emitLog(win, `已启用 Qwen 插件，使用 provider: ${providerId}`)
  return providerId
}

async function runGatewayFlow(win: BrowserWindow) {
  const exec = (cmd: string) => execCommand(cmd, win)

  await ensureGatewayMode(exec, win)
  const { dashboardUrl } = await resolveDashboardUrlWithToken(exec, win)

  emitStep(win, 'Starting Gateway')
  const gateway = await startGateway()
  supervisor.track(gateway)
  gateway.stdout?.on('data', (chunk) => emitLog(win, chunk.toString()))
  gateway.stderr?.on('data', (chunk) => emitLog(win, chunk.toString()))

  currentDashboardUrl = dashboardUrl
  win.webContents.send('gateway:ready', { dashboardUrl })
}

async function runEnsureGatewayToken(win: BrowserWindow) {
  const exec = (cmd: string) => execCommand(cmd, win)
  try {
    await ensureGatewayMode(exec, win)
    const { dashboardUrl } = await resolveDashboardUrlWithToken(exec, win)
    return { ok: true as const, dashboardUrl }
  } catch (error: any) {
    return {
      ok: false as const,
      error: error?.message || '未检测到控制台 token，请先完成授权。'
    }
  }
}

async function runUninstallFlow(win: BrowserWindow) {
  const logs: string[] = []
  const log = (message: string) => {
    logs.push(message)
    win.webContents.send('uninstall:log', message)
  }

  const pushOutput = (text: string) => {
    text
      .split(/\r?\n/)
      .map(line => line.trimEnd())
      .filter(Boolean)
      .forEach(line => log(line))
  }

  const runCommand = async (label: string, command: string) => {
    log(label)
    const result = await execCommand(command)
    if (result.stdout) pushOutput(result.stdout)
    if (result.stderr) pushOutput(result.stderr)
    return result
  }

  const safeRemove = async (target: string, label?: string) => {
    try {
      await fs.rm(target, { recursive: true, force: true })
      log(`已移除 ${label ?? target}`)
    } catch (error: any) {
      if (error?.code === 'ENOENT') return
      log(`移除失败 ${label ?? target}: ${error?.message || '未知错误'}`)
    }
  }

  const removeOpenclawLines = async (filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      const lines = content.split(/\r?\n/)
      const filtered = lines.filter(line => !line.includes('openclaw'))
      if (filtered.length !== lines.length) {
        await fs.writeFile(filePath, filtered.join('\n'))
        log(`已更新 ${filePath}`)
      }
    } catch (error: any) {
      if (error?.code === 'ENOENT') return
      log(`更新失败 ${filePath}: ${error?.message || '未知错误'}`)
    }
  }

  log('开始卸载 OpenClaw...')
  supervisor.stopAll()
  log('已停止应用内 OpenClaw 进程。')

  const platform = process.platform
  const homeDir = os.homedir()

  await runCommand('正在卸载 npm 全局包...', 'npm uninstall -g openclaw')
  await runCommand('正在尝试卸载 pnpm 全局包...', 'pnpm remove -g openclaw')
  await runCommand('正在尝试卸载 yarn 全局包...', 'yarn global remove openclaw')

  const npmBinResult = await execCommand('npm bin -g')
  if (npmBinResult.stderr) {
    pushOutput(npmBinResult.stderr)
  }
  if (npmBinResult.stdout) {
    const npmBin = npmBinResult.stdout.trim()
    await safeRemove(join(npmBin, 'openclaw'), 'npm 全局命令 openclaw')
    await safeRemove(join(npmBin, 'openclaw.cmd'), 'npm 全局命令 openclaw.cmd')
    await safeRemove(join(npmBin, 'openclaw.ps1'), 'npm 全局命令 openclaw.ps1')
  } else {
    log('未获取到 npm bin 路径，已跳过全局命令清理。')
  }

  const npmRootResult = await execCommand('npm root -g')
  if (npmRootResult.stderr) {
    pushOutput(npmRootResult.stderr)
  }
  if (npmRootResult.stdout) {
    const npmRoot = npmRootResult.stdout.trim()
    await safeRemove(join(npmRoot, 'openclaw'), 'npm 全局库 openclaw')
  } else {
    log('未获取到 npm root 路径，已跳过全局库清理。')
  }

  await safeRemove(join(homeDir, '.openclaw'), '用户配置目录 ~/.openclaw')

  if (platform === 'darwin') {
    await safeRemove(join(homeDir, 'Library', 'Application Support', 'openclaw'), '应用支持目录')
    await safeRemove(join(homeDir, 'Library', 'Logs', 'openclaw'), '日志目录')
    await safeRemove(join(homeDir, 'Library', 'Caches', 'openclaw'), '缓存目录')
    await safeRemove('/usr/local/bin/openclaw', '可执行文件 /usr/local/bin/openclaw')
    await safeRemove('/opt/homebrew/bin/openclaw', '可执行文件 /opt/homebrew/bin/openclaw')
    await removeOpenclawLines(join(homeDir, '.zshrc'))
    await removeOpenclawLines(join(homeDir, '.bashrc'))
    await removeOpenclawLines(join(homeDir, '.bash_profile'))
    await removeOpenclawLines(join(homeDir, '.zprofile'))
  }

  if (platform === 'win32') {
    const appData = process.env.APPDATA || ''
    const localAppData = process.env.LOCALAPPDATA || ''
    const programData = process.env.ProgramData || 'C:\\ProgramData'
    await safeRemove(join(appData, 'openclaw'), 'APPDATA\\openclaw')
    await safeRemove(join(localAppData, 'openclaw'), 'LOCALAPPDATA\\openclaw')
    await safeRemove(join(programData, 'openclaw'), 'ProgramData\\openclaw')
  }

  if (platform !== 'darwin' && platform !== 'win32') {
    log('当前系统暂未提供自动卸载脚本，请使用手动说明。')
    return { ok: false, logs, error: '当前系统未提供自动卸载脚本。' }
  }

  log('卸载流程执行完毕。')
  return { ok: true, logs }
}

async function runGetModelConfig() {
  const parseJson = (stdout: string) => {
    if (!stdout) return undefined
    return JSON.parse(stdout)
  }

  const readConfigValue = async (path: string, allowMissing = false) => {
    const result = await execCommand(`openclaw config get ${path} --json`)
    if (result.code === 0) {
      try {
        return { ok: true as const, value: parseJson(result.stdout) }
      } catch {
        return { ok: false as const, error: '配置解析失败，请检查 openclaw config 输出。' }
      }
    }
    const message = result.stderr || result.stdout || ''
    if (allowMissing && message.includes('Config path not found')) {
      return { ok: true as const, value: undefined }
    }
    return { ok: false as const, error: message || '读取配置失败。' }
  }

  const providersResult = await readConfigValue('models.providers', true)
  if (!providersResult.ok) {
    return { ok: false, error: providersResult.error }
  }

  const primaryResult = await readConfigValue('agents.defaults.model.primary', true)
  if (!primaryResult.ok) {
    return { ok: false, error: primaryResult.error }
  }

  const providers = providersResult.value && typeof providersResult.value === 'object'
    ? (providersResult.value as Record<string, any>)
    : {}
  const primary =
    typeof primaryResult.value === 'string' ? primaryResult.value : primaryResult.value ?? ''
  const parsedPrimary = parsePrimaryModel(primary)
  const providerId = pickProviderId(parsedPrimary.providerId, providers)
  const providerConfig = providerId ? providers?.[providerId] ?? {} : {}

  return {
    ok: true,
    data: {
      providerId,
      apiKey: providerConfig?.apiKey ?? '',
      baseUrl: providerConfig?.baseUrl ?? '',
      defaultModel: parsedPrimary.model ?? ''
    }
  }
}

async function runSaveModelConfig(payload: ModelConfigPayload) {
  const providerId = payload.providerId?.trim()
  if (!providerId) {
    return { ok: false, error: '请先选择或填写 provider id。' }
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(providerId)) {
    return { ok: false, error: 'provider id 仅支持字母、数字、点、下划线与中划线。' }
  }

  const defaultModel = payload.defaultModel?.trim()
  if (!defaultModel) {
    return { ok: false, error: '请填写默认模型名称。' }
  }

  const apiKey = payload.apiKey?.trim() ?? ''
  const baseUrlInput = payload.baseUrl?.trim() ?? ''
  const resolvedBaseUrl = baseUrlInput || resolveDefaultBaseUrl(providerId)
  if (!resolvedBaseUrl) {
    return { ok: false, error: 'Base URL 不能为空，请填写完整的 API 地址。' }
  }

  const providerConfig: Record<string, any> = {
    baseUrl: resolvedBaseUrl,
    api: resolveProviderApi(providerId),
    models: [{ id: defaultModel, name: defaultModel }]
  }
  if (apiKey) {
    providerConfig.apiKey = apiKey
  }

  const commands = [
    `openclaw config set models.providers.${providerId} ${shellEscape(JSON.stringify(providerConfig))}`,
    `openclaw config set agents.defaults.model.primary ${shellEscape(`${providerId}/${defaultModel}`)}`
  ]

  for (const command of commands) {
    const result = await execCommand(command)
    if (result.code !== 0) {
      return { ok: false, error: result.stderr || result.stdout || '保存配置失败。' }
    }
  }

  const validate = await execCommand('openclaw config validate')
  if (validate.code !== 0) {
    return { ok: false, error: validate.stderr || validate.stdout || '配置校验失败。' }
  }

  return { ok: true }
}

function createWindow() {
  const preloadJs = join(__dirname, '../preload/index.js')
  const preloadMjs = join(__dirname, '../preload/index.mjs')
  const preloadPath = existsSync(preloadJs) ? preloadJs : preloadMjs
  const isMac = process.platform === 'darwin'
  const iconPath = resolveAppIconPath()
  const appIcon = iconPath ? nativeImage.createFromPath(iconPath) : null
  const windowIcon = appIcon && !appIcon.isEmpty() ? appIcon : undefined
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: '#f6f8fb',
    icon: windowIcon,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    titleBarOverlay: isMac
      ? undefined
      : {
          color: '#f6f8fb',
          symbolColor: '#0f172a',
          height: 36
        },
    webPreferences: {
      preload: preloadPath,
      webviewTag: true
    }
  })
  if (isMac && windowIcon) {
    app.dock.setIcon(windowIcon)
  }

  if (!app.isPackaged) {
    console.log(`[preload] path=${preloadPath} exists=${existsSync(preloadPath)}`)
    win.webContents.on('console-message', (_event, level, message) => {
      console.log(`[renderer][${level}] ${message}`)
    })
    win.webContents.once('did-finish-load', async () => {
      try {
        const hasOpenclaw = await win.webContents.executeJavaScript('Boolean(window.openclaw)')
        console.log(`[preload] window.openclaw=${hasOpenclaw}`)
      } catch (error) {
        console.log('[preload] window.openclaw check failed', error)
      }
    })
  }

  registerIpcHandlers({
    startInstall: async () => runInstallFlow(win),
    retryInstall: async () => runInstallFlow(win),
    startAuth: async () => runAuthFlow(win),
    startExternalAuth: async () => runExternalAuthFlow(win),
    startGateway: async () => runGatewayFlow(win),
    ensureGatewayToken: async () => runEnsureGatewayToken(win),
    startUninstall: async () => runUninstallFlow(win),
    startupBootstrap: async () => runStartupBootstrap(win),
    getLogs,
    getModelConfig: async () => runGetModelConfig(),
    saveModelConfig: async (payload) => runSaveModelConfig(payload),
    startQwenAuth: async () =>
      runExternalAuthFlow(win, { autoOpen: false, autoOpenFallbackMs: 10000 })
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('before-quit', () => supervisor.stopAll())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
