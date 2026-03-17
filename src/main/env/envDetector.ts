type ExecResult = { stdout: string; stderr: string; code: number }
export type ExecFn = (cmd: string) => Promise<ExecResult>

export async function detectEnv(exec: ExecFn) {
  const node = await exec('node -v')
  const git = await exec('git --version')
  const brew = await exec('which brew')
  const winget = await exec('where winget')
  const gitVersionMatch = git.stdout.match(/(\d+\.\d+\.\d+)/)

  return {
    node: { available: node.code === 0, version: node.stdout.trim() },
    git: { available: git.code === 0, version: gitVersionMatch ? gitVersionMatch[1] : '' },
    managers: { brew: brew.code === 0, winget: winget.code === 0 }
  }
}
