import { describe, it, expect } from 'vitest'
import { isInstalledLts, selectLatestLts, isMajorAtLeast } from '../nodeLts'

const indexJson = [
  { version: 'v22.1.0', lts: 'Jod', files: ['msi', 'pkg'] },
  { version: 'v22.0.0', lts: 'Jod', files: ['msi', 'pkg'] },
  { version: 'v23.0.0', lts: null, files: ['msi', 'pkg'] }
]

describe('nodeLts', () => {
  it('detects LTS by exact version match', () => {
    expect(isInstalledLts('v22.0.0', indexJson)).toBe(true)
    expect(isInstalledLts('v23.0.0', indexJson)).toBe(false)
  })

  it('selects latest LTS', () => {
    expect(selectLatestLts(indexJson).version).toBe('v22.1.0')
  })

  it('checks major version', () => {
    expect(isMajorAtLeast('v22.0.0', 22)).toBe(true)
  })
})
