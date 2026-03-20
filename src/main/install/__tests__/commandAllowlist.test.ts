import { describe, it, expect } from 'vitest'
import { assertAllowedCommand } from '../commandAllowlist'

describe('commandAllowlist', () => {
  it('allows known commands', () => {
    expect(() => assertAllowedCommand('msiexec /i installer.msi /qn /norestart')).not.toThrow()
  })

  it('allows openclaw oauth login command', () => {
    expect(() => assertAllowedCommand('openclaw models auth login --provider qwen')).not.toThrow()
    expect(() => assertAllowedCommand('openclaw models auth login --provider qwen-portal')).not.toThrow()
  })

  it('allows openclaw plugin commands', () => {
    expect(() => assertAllowedCommand('openclaw plugins list --json')).not.toThrow()
    expect(() => assertAllowedCommand('openclaw plugins enable qwen-portal-auth')).not.toThrow()
  })

  it('allows openclaw config commands', () => {
    expect(() => assertAllowedCommand('openclaw config get --json')).not.toThrow()
    expect(() => assertAllowedCommand('openclaw config set models.providers.qwen.apiKey "abc"')).not.toThrow()
    expect(() => assertAllowedCommand('openclaw config unset models.providers.qwen.baseUrl')).not.toThrow()
    expect(() => assertAllowedCommand('openclaw config validate')).not.toThrow()
  })

  it('allows openclaw doctor token generation', () => {
    expect(() => assertAllowedCommand('openclaw doctor --generate-gateway-token')).not.toThrow()
  })
})
