import { describe, it, expect } from 'vitest'
import { assertAllowedUrl } from '../allowlist'

describe('allowlist', () => {
  it('accepts allowed hostnames', () => {
    expect(() => assertAllowedUrl('https://nodejs.org/dist/index.json')).not.toThrow()
  })

  it('rejects unknown hostnames', () => {
    expect(() => assertAllowedUrl('https://example.com/foo')).toThrow()
  })
})
