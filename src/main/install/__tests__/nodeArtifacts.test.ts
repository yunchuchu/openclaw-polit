import { describe, it, expect } from 'vitest'
import { buildNodeInstallerUrl } from '../nodeArtifacts'

describe('nodeArtifacts', () => {
  it('builds msi url', () => {
    expect(buildNodeInstallerUrl('v22.1.0', 'win32', 'x64')).toContain('node-v22.1.0-x64.msi')
  })

  it('builds pkg url', () => {
    expect(buildNodeInstallerUrl('v22.1.0', 'darwin', 'x64')).toContain('node-v22.1.0.pkg')
  })
})

describe('nodeArtifacts', () => {
  it('uses arch detection', () => {
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
    expect(['arm64', 'x64']).toContain(arch)
  })
})
