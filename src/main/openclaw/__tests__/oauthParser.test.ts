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

  it('handles authorize url split across lines', () => {
    const output = `
◑  Starting Qwen OAuth…

◇  Qwen OAuth ────────────────────────────────────────────────────────────╮
│  Open https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&
│  client=qwen-code to approve access.
│  If prompted, enter the code Y0-LDRXQ.
╰──────────────────────────────────────────────────────────────────────────╯
`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code')
    expect(result.userCode).toBe('Y0-LDRXQ')
    expect(result.error).toBeNull()
  })

  it('trims trailing punctuation from the url', () => {
    const output = `
◑  Starting Qwen OAuth…

◇  Qwen OAuth ────────────────────────────────────────────────────────────╮
│  Open https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code.
│  If prompted, enter the code Y0-LDRXQ.
╰──────────────────────────────────────────────────────────────────────────╯
`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code')
    expect(result.userCode).toBe('Y0-LDRXQ')
    expect(result.error).toBeNull()
  })

  it('extracts user code from text-only lines', () => {
    const output = `
◑  Starting Qwen OAuth…

◇  Qwen OAuth ────────────────────────────────────────────────────────────╮
│  Open https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code to approve access.
│  Your code is Y0-LDRXQ.
╰──────────────────────────────────────────────────────────────────────────╯
`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code')
    expect(result.userCode).toBe('Y0-LDRXQ')
    expect(result.error).toBeNull()
  })

  it('extracts code from text when url lacks user_code param', () => {
    const output = `
◑  Starting Qwen OAuth…

◇  Qwen OAuth ────────────────────────────────────────────────────────────╮
│  Open https://chat.qwen.ai/authorize?client=qwen-code to approve access.
│  Your code is QW-12345.
╰──────────────────────────────────────────────────────────────────────────╯
`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?client=qwen-code')
    expect(result.userCode).toBe('QW-12345')
    expect(result.error).toBeNull()
  })

  it('prefers authorize url when multiple urls share the same line', () => {
    const output = `
◑  Starting Qwen OAuth…

◇  Qwen OAuth ────────────────────────────────────────────────────────────╮
│  Connect via https://chat.qwen.ai/connect?client=qwen-code and https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code for setup.
│  If prompted, enter the code Y0-LDRXQ.
╰──────────────────────────────────────────────────────────────────────────╯
`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code')
    expect(result.userCode).toBe('Y0-LDRXQ')
    expect(result.error).toBeNull()
  })

  it('does not treat authorize-only queries as authorize path', () => {
    const output = `
◑  Starting Qwen OAuth…

◇  Qwen OAuth ────────────────────────────────────────────────────────────╮
│  Visit https://example.com/help https://chat.qwen.ai/?redirect=authorize https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code for details.
│  Your code is Y0-LDRXQ.
╰──────────────────────────────────────────────────────────────────────────╯
`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code')
    expect(result.userCode).toBe('Y0-LDRXQ')
    expect(result.error).toBeNull()
  })

  it('prefers authorize url even when it appears on a later line', () => {
    const output = `
◑  Starting Qwen OAuth…

◇  Qwen OAuth ────────────────────────────────────────────────────────────╮
│  Visit https://example.com/help for instructions.
│  Then open https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code to continue.
╰──────────────────────────────────────────────────────────────────────────╯
`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code')
    expect(result.userCode).toBe('Y0-LDRXQ')
    expect(result.error).toBeNull()
  })

  it('trims closing parentheses from the extracted url', () => {
    const output = `
◑  Starting Qwen OAuth…

◇  Qwen OAuth ────────────────────────────────────────────────────────────╮
│  Open https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code)
│  If prompted, enter the code Y0-LDRXQ.
╰──────────────────────────────────────────────────────────────────────────╯
`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize?user_code=Y0-LDRXQ&client=qwen-code')
    expect(result.userCode).toBe('Y0-LDRXQ')
    expect(result.error).toBeNull()
  })

  it('does not extend url when it ends with a question mark before plain text', () => {
    const output = `
◑  Starting Qwen OAuth…

◇  Qwen OAuth ────────────────────────────────────────────────────────────╮
│  Open https://chat.qwen.ai/authorize?        
│  This line is just an explanatory sentence.
╰──────────────────────────────────────────────────────────────────────────╯
`
    const result = parseOAuthOutput(output)
    expect(result.url).toBe('https://chat.qwen.ai/authorize')
    expect(result.userCode).toBeNull()
    expect(result.error).toBe('MISSING_FIELDS')
  })
})
