import { describe, it, expect } from 'vitest'
import { detectEnv } from '../envDetector'

const fakeExec = async (cmd: string) => {
  if (cmd.includes('node')) return { stdout: 'v22.0.0', stderr: '', code: 0 }
  if (cmd.includes('git')) return { stdout: 'git version 2.47.0', stderr: '', code: 0 }
  if (cmd.includes('brew')) return { stdout: '/opt/homebrew/bin/brew', stderr: '', code: 0 }
  if (cmd.includes('winget')) return { stdout: 'winget', stderr: '', code: 0 }
  return { stdout: '', stderr: 'not found', code: 1 }
}

describe('detectEnv', () => {
  it('detects node, git, and package managers', async () => {
    const result = await detectEnv(fakeExec)
    expect(result.node.version).toBe('v22.0.0')
    expect(result.git.version).toBe('2.47.0')
    expect(result.managers.brew).toBe(true)
    expect(result.managers.winget).toBe(true)
  })
})
