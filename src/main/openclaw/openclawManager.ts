import { spawn } from 'node:child_process'
import { parseDashboardUrl } from './parseDashboardUrl'
import { parseOAuthOutput } from './oauthParser'

const MAX_OAUTH_BUFFER_CHARS = 20000

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

export function startOAuthFlow(
  onUpdate: (data: { url: string | null; userCode: string | null; error: string | null; chunk: string }) => void
) {
  const proc = spawn('openclaw', ['models', 'auth', 'login', '--provider', 'qwen'], { stdio: 'pipe' })
  let buffer = ''

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

  proc.stdout?.on('data', (chunk) => handleChunk(chunk.toString()))
  proc.stderr?.on('data', (chunk) => handleChunk(chunk.toString()))

  proc.on('error', (err) => {
    const message = String(err && (err as Error).message ? (err as Error).message : err)
    pushUpdate(message)
  })

  proc.on('exit', () => {
    pushUpdate('')
  })

  return proc
}
