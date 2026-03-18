import { describe, it, expect } from 'vitest'
import { parseOAuthOutput } from '../oauthParser'

describe('parseOAuthOutput', () => {
  it('extracts authorize url and user code from standard output', () => {
    const output = `
◑  Starting Qwen OAuth…

◇  Qwen OAuth ────────────────────────────────────────────────────────────╮
│  Open https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code to
│  approve access.
│  If prompted, enter the code Y0-LDRXQ.
╰──────────────────────────────────────────────────────────────────────────╯
`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code')
    expect(result.userCode).toBe('Y0-LDRXQ')
    expect(result.error).toBeNull()
  })

  it('returns error when fields are missing', () => {
    const output = `Qwen OAuth complete`
    const result = parseOAuthOutput(output)
    expect(result.url).toBeNull()
    expect(result.userCode).toBeNull()
    expect(result.error).toBe('MISSING_FIELDS')
  })
})
