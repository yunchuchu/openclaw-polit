import { describe, it, expect } from 'vitest'
import { buildNodeInstallCommand, buildGitInstallCommand, isManagerAvailable } from '../packageManager'

const fakeExec = async (cmd: string) => ({
  stdout: cmd.includes('brew') ? '/opt/homebrew/bin/brew' : '',
  stderr: '',
  code: cmd.includes('brew') ? 0 : 1
})

describe('packageManager', () => {
  it('builds winget commands', () => {
    expect(buildNodeInstallCommand('win32', 'winget', 22)).toContain('OpenJS.NodeJS.LTS')
    expect(buildGitInstallCommand('win32', 'winget')).toContain('Git.Git')
  })

  it('builds brew commands', () => {
    expect(buildNodeInstallCommand('darwin', 'brew', 22)).toContain('brew install node@22')
    expect(buildGitInstallCommand('darwin', 'brew')).toContain('brew install git')
  })

  it('detects manager availability', async () => {
    expect(await isManagerAvailable('darwin', 'brew', fakeExec as any)).toBe(true)
  })
})
