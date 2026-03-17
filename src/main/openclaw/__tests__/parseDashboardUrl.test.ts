import { describe, it, expect } from 'vitest'
import { parseDashboardUrl } from '../parseDashboardUrl'

describe('parseDashboardUrl', () => {
  it('extracts URL from dashboard output', () => {
    const output = `\nDashboard URL: http://127.0.0.1:18789/#token=abc123\nCopied to clipboard.\n`
    expect(parseDashboardUrl(output)).toBe('http://127.0.0.1:18789/#token=abc123')
  })
})
