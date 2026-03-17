import { describe, it, expect } from 'vitest'
import { fetchNodeIndex } from '../nodeIndexClient'

const indexJson = [
  { version: 'v22.1.0', lts: 'Jod', files: ['msi', 'pkg'] },
  { version: 'v22.0.0', lts: 'Jod', files: ['msi', 'pkg'] },
  { version: 'v23.0.0', lts: null, files: ['msi', 'pkg'] }
]

describe('nodeIndexClient', () => {
  it('parses index json', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => indexJson })
    const result = await fetchNodeIndex(fakeFetch as any)
    expect(result).toHaveLength(3)
  })
})
