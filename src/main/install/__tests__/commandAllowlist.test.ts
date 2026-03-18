import { describe, it, expect } from 'vitest'
import { assertAllowedCommand } from '../commandAllowlist'

describe('commandAllowlist', () => {
  it('allows known commands', () => {
    expect(() => assertAllowedCommand('msiexec /i installer.msi /qn /norestart')).not.toThrow()
  })

  it('allows openclaw oauth login command', () => {
    expect(() => assertAllowedCommand('openclaw models auth login --provider qwen')).not.toThrow()
  })
})
