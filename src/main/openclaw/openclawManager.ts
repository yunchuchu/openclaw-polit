import { spawn } from 'node:child_process'
import * as nodePty from 'node-pty'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { parseDashboardUrl } from './parseDashboardUrl'
import { parseOAuthOutput } from './oauthParser'

const MAX_OAUTH_BUFFER_CHARS = 20000
const require = createRequire(import.meta.url)

type OAuthProcess = {
  on: (event: 'exit', cb: (code: number | null) => void) => void
  kill: (signal?: NodeJS.Signals | number) => void
}

const ensurePtyHelperExecutable = () => {
  if (process.platform === 'win32') return
  const candidates: string[] = []

  try {
    const entry = require.resolve('node-pty')
    const root = path.resolve(entry, '..', '..')
    candidates.push(path.join(root, 'build', 'Release', 'spawn-helper'))
    candidates.push(path.join(root, 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper'))
  } catch {
    return
  }

  for (const helperPath of candidates) {
    try {
      const resolved = helperPath.replace('app.asar', 'app.asar.unpacked')
      if (!fs.existsSync(resolved)) continue
      const stat = fs.statSync(resolved)
      if ((stat.mode & 0o111) === 0) {
        fs.chmodSync(resolved, 0o755)
      }
    } catch {
      // ignore
    }
  }
}

export async function startGateway() {
  return spawn('openclaw', ['gateway', 'run'], { stdio: 'pipe' })
}

export async function getDashboardUrl(
  exec: (cmd: string) => Promise<{ stdout: string; stderr: string; code: number }>
) {
  const result = await exec('openclaw dashboard --no-open')
  const url = parseDashboardUrl(result.stdout)
  if (!url) throw new Error('Dashboard URL not found')
  return url
}

export function hasDashboardToken(url: string | null) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    if (parsed.search && new URLSearchParams(parsed.search).has('token')) {
      return true
    }
    if (parsed.hash) {
      const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash
      if (new URLSearchParams(hash).has('token')) {
        return true
      }
    }
  } catch {
    // ignore parse error and fallback to raw match
  }
  return /(^|[#?&])token=/.test(url)
}

export function startOAuthFlow(
  provider: string,
  onUpdate: (data: { url: string | null; userCode: string | null; error: string | null; chunk: string }) => void
): OAuthProcess {
  ensurePtyHelperExecutable()
  const proc = nodePty.spawn('openclaw', ['models', 'auth', 'login', '--provider', provider], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: process.env as NodeJS.ProcessEnv
  })
  let buffer = ''
  const exitListeners: Array<(code: number | null) => void> = []

  const pushUpdate = (chunk: string) => {
    const parsed = parseOAuthOutput(buffer)
    onUpdate({ ...parsed, chunk })
  }

  const handleChunk = (text: string) => {
    buffer += text
    if (buffer.length > MAX_OAUTH_BUFFER_CHARS) {
      buffer = buffer.slice(-MAX_OAUTH_BUFFER_CHARS)
    }
    pushUpdate(text)
  }

  proc.onData((data) => handleChunk(String(data)))
  proc.onExit(({ exitCode }) => {
    pushUpdate('')
    exitListeners.forEach((listener) => listener(exitCode ?? null))
  })

  return {
    on: (event, cb) => {
      if (event === 'exit') exitListeners.push(cb)
    },
    kill: (signal) => {
      proc.kill(signal)
    }
  }
}
