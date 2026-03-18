export function parseOAuthOutput(output: string): {
  url: string | null
  userCode: string | null
  error: string | null
} {
  const prefixPattern = /^\s*[◇│◑]+\s?/
  const lines = output
    .split(/\r?\n/)
    .map(line => line.replace(prefixPattern, '').trim())
    .filter(Boolean)

  let url: string | null = null
  let userCode: string | null = null

  const extractUrl = (line: string, index: number) => {
    const match = line.match(/https?:\/\/[^\s'"<>]+/i)
    if (!match) return null
    let candidate = match[0]
    const remainder = line.slice(line.indexOf(candidate) + candidate.length).trim()
    let lookahead = index

    while (!remainder && lookahead + 1 < lines.length) {
      const nextLine = lines[lookahead + 1]
      const token = nextLine.split(/\s+/)[0] ?? ''
      const sanitized = token.replace(/[.,;:!?]+$/, '')
      if (!sanitized) break
      const lastChar = candidate[candidate.length - 1] ?? ''
      const canContinue =
        /[&=?\/:%\-+]$/.test(lastChar) || sanitized.includes('=') || sanitized.includes('&')
      if (!canContinue) break
      candidate += sanitized
      lookahead++
    }

    return candidate.replace(/[.,;:!?]+$/, '')
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx]
    if (!url) {
      const candidate = extractUrl(line, idx)
      if (candidate) {
        url = candidate
        if (!userCode) {
          try {
            const params = new URL(url).searchParams
            userCode = params.get('user_code')
          } catch (err) {
            ;// invalid URL, continue
          }
        }
      }
    }

    if (!userCode) {
      const codeMatch = line.match(/code[:\s]+([A-Z0-9-]+)/i)
      if (codeMatch) userCode = codeMatch[1]
    }
  }

  const error = url && userCode ? null : 'MISSING_FIELDS'
  return { url, userCode, error }
}
