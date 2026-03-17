import os from 'node:os'
import path from 'node:path'

export function getMacFallbackPrefix() {
  return path.join(os.homedir(), '.openclaw', 'npm-global')
}

export async function ensureWindowsNpmPath(
  exec: (cmd: string) => Promise<{ stdout: string; stderr: string; code: number }>
) {
  const result = await exec('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\\"PATH\\",\\"User\\")"')
  const appData = process.env.APPDATA || ''
  const npmPath = `${appData}\\npm`
  if (result.stdout && !result.stdout.includes(npmPath)) {
    await exec(`setx /M PATH "${npmPath};%PATH%"`)
  }
}

export async function installOpenClawGlobal(
  exec: (cmd: string) => Promise<{ stdout: string; stderr: string; code: number }>,
  setEnv: (key: string, value: string) => void
) {
  const first = await exec('npm i -g openclaw')
  if (first.code === 0) return

  if (first.stderr.includes('EACCES')) {
    const prefix = getMacFallbackPrefix()
    await exec(`npm config set prefix "${prefix}"`)
    setEnv('PATH', `${prefix}/bin:${process.env.PATH || ''}`)
    await exec(`bash -lc "echo 'export PATH=${prefix}/bin:$PATH' >> ~/.zprofile"`)
    const retry = await exec('npm i -g openclaw')
    if (retry.code !== 0) throw new Error(retry.stderr)
    return
  }

  throw new Error(first.stderr)
}
