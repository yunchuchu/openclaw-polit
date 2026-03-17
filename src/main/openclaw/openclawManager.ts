import { spawn } from 'node:child_process'
import { parseDashboardUrl } from './parseDashboardUrl'

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
