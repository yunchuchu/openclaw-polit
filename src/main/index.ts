import { app, BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
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
import { getDashboardUrl, startGateway } from './openclaw/openclawManager'

const supervisor = new ProcessSupervisor()
let currentDashboardUrl: string | null = null

type ExecResult = { stdout: string; stderr: string; code: number }

type ExecFn = (cmd: string) => Promise<ExecResult>

function resolvePortableGitArchive() {
  const filename = 'PortableGit-2.53.0.2-64-bit.7z.exe'
  if (app.isPackaged) {
    return join(process.resourcesPath, 'portable-git', 'windows', filename)
  }
  return join(app.getAppPath(), 'resources', 'portable-git', 'windows', filename)
}

function getPortableGitInstallDir() {
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
  return join(programFiles, 'OpenClaw', 'PortableGit')
}

function getLtsMajor(version: string) {
  const cleaned = version.replace(/^v/, '')
  return Number(cleaned.split('.')[0])
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
    let env = await detectEnv(exec)

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
    env = await detectEnv(exec)

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

    emitStep(win, 'Starting Gateway')
    const gateway = await startGateway()
    supervisor.track(gateway)
    gateway.stdout?.on('data', (chunk) => emitLog(win, chunk.toString()))
    gateway.stderr?.on('data', (chunk) => emitLog(win, chunk.toString()))

    emitStep(win, 'Fetching Dashboard URL')
    currentDashboardUrl = await getDashboardUrl(exec)
    win.webContents.send('installer:success', { dashboardUrl: currentDashboardUrl })
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      webviewTag: true
    }
  })

  registerIpcHandlers({
    startInstall: async () => runInstallFlow(win),
    retryInstall: async () => runInstallFlow(win),
    getLogs
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
