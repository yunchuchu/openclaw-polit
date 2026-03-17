type Platform = 'win32' | 'darwin'

type Manager = 'winget' | 'brew'

type ExecFn = (cmd: string) => Promise<{ stdout: string; stderr: string; code: number }>

export function buildNodeInstallCommand(platform: Platform, manager: Manager, ltsMajor: number): string {
  if (platform === 'win32' && manager === 'winget') {
    return 'winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements --silent'
  }
  if (platform === 'darwin' && manager === 'brew') {
    return `brew install node@${ltsMajor}`
  }
  throw new Error('Unsupported platform/manager')
}

export function buildGitInstallCommand(platform: Platform, manager: Manager): string {
  if (platform === 'win32' && manager === 'winget') {
    return 'winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent'
  }
  if (platform === 'darwin' && manager === 'brew') {
    return 'brew install git'
  }
  throw new Error('Unsupported platform/manager')
}

export async function isManagerAvailable(platform: Platform, manager: Manager, exec: ExecFn) {
  if (platform === 'darwin' && manager === 'brew') return (await exec('which brew')).code === 0
  if (platform === 'win32' && manager === 'winget') return (await exec('where winget')).code === 0
  return false
}
