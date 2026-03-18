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
  let fallbackUrl: string | null = null
  let authorizeUrl: string | null = null

  const trailingPunctuation = /[.,;:!?)}\]\}]+$/
  const trimTrailing = (value: string) => value.replace(trailingPunctuation, '')

  const extractUrl = (line: string, index: number) => {
    const match = line.match(/https?:\/\/[^\s'"<>]+/i)
    if (!match) return null
    let candidate = match[0]
    const remainder = line.slice(line.indexOf(candidate) + candidate.length).trim()
    let lookahead = index

    while (!remainder && lookahead + 1 < lines.length) {
      const nextLine = lines[lookahead + 1]
      const token = nextLine.split(/\s+/)[0] ?? ''
      const sanitized = token.replace(trailingPunctuation, '')
      if (!sanitized) break
      const shouldExtend = /^[?&]/.test(sanitized) || sanitized.includes('=')
      if (!shouldExtend) break
      candidate += sanitized
      lookahead++
    }

    return trimTrailing(candidate)
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const candidate = extractUrl(lines[idx], idx)
    if (!candidate) continue
    if (!fallbackUrl) fallbackUrl = candidate
    if (/authorize/i.test(candidate)) {
      authorizeUrl = candidate
      break
    }
  }

  url = authorizeUrl ?? fallbackUrl

  if (url) {
    try {
      const params = new URL(url).searchParams
      userCode = params.get('user_code')
    } catch (err) {
      ;// invalid URL, continue
    }
  }

  if (!userCode && lines.length) {
    for (const line of lines) {
      const codeMatch = line.match(/(?:^|\s)code\b\s*(?:is|:)?\s*([A-Z0-9-]+)/i)
      if (codeMatch) {
        userCode = codeMatch[1]
        break
      }
    }
  }

  const error = url && userCode ? null : 'MISSING_FIELDS'
  return { url, userCode, error }
}
