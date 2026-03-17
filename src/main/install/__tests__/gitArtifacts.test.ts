import { describe, it, expect } from 'vitest'
import { buildGitPkgUrl } from '../gitArtifacts'

describe('gitArtifacts', () => {
  it('throws when macOS pkg is not supported', () => {
    expect(() => buildGitPkgUrl()).toThrow()
  })
})
