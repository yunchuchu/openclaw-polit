import { spawn } from 'node:child_process'
import { parseDashboardUrl } from './parseDashboardUrl'
import { parseOAuthOutput } from './oauthParser'

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

  const handleChunk = (text: string) => {
    buffer += text
    const parsed = parseOAuthOutput(buffer)
    onUpdate({ ...parsed, chunk: text })
  }

  proc.stdout?.on('data', (chunk) => handleChunk(chunk.toString()))
  proc.stderr?.on('data', (chunk) => handleChunk(chunk.toString()))

  return proc
}
