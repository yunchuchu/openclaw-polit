type ExecResult = { stdout: string; stderr: string; code: number }
export type ExecFn = (cmd: string) => Promise<ExecResult>

export async function detectEnv(exec: ExecFn, platform: NodeJS.Platform = process.platform) {
  const node = await exec('node -v')
  const git = await exec('git --version')
  const brew = platform === 'darwin' ? await exec('which brew') : { stdout: '', stderr: '', code: 1 }
  const winget = platform === 'win32' ? await exec('where winget') : { stdout: '', stderr: '', code: 1 }
  const gitVersionMatch = git.stdout.match(/(\d+\.\d+\.\d+)/)

  return {
    node: { available: node.code === 0, version: node.stdout.trim() },
    git: { available: git.code === 0, version: gitVersionMatch ? gitVersionMatch[1] : '' },
    managers: { brew: brew.code === 0, winget: winget.code === 0 }
  }
}
