import { describe, it, expect } from 'vitest'
import { assertAllowedCommand } from '../commandAllowlist'

describe('commandAllowlist', () => {
  it('allows known commands', () => {
    expect(() => assertAllowedCommand('msiexec /i installer.msi /qn /norestart')).not.toThrow()
  })
})
