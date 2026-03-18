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

  const trailingPunctuation = /[.,;:!?)}\]\}]+$/
  const trimTrailing = (value: string) => value.replace(trailingPunctuation, '')

  const urlRegex = /https?:\/\/[^\s'"<>]+/gi
  const collectCandidatesFromLine = (line: string, index: number): string[] => {
    urlRegex.lastIndex = 0
    const matches = Array.from(line.matchAll(urlRegex))
    if (!matches.length) return []

    return matches
      .map(match => {
        let candidate = match[0]
        const startIndex = match.index ?? 0
        const remainder = line.slice(startIndex + candidate.length).trim()
        let lookahead = index

        if (!remainder && lookahead + 1 < lines.length) {
          const nextLine = lines[lookahead + 1]
          const token = nextLine.split(/\s+/)[0] ?? ''
          const sanitized = token.replace(trailingPunctuation, '')
          if (sanitized) {
            const shouldExtend = /^[?&]/.test(sanitized) || sanitized.includes('=')
            if (shouldExtend) candidate += sanitized
          }
        }

        return trimTrailing(candidate)
      })
      .filter(Boolean)
  }

  const candidates: Array<{ value: string; isAuthorizePath: boolean }> = []
  for (let idx = 0; idx < lines.length; idx++) {
    const lineCandidates = collectCandidatesFromLine(lines[idx], idx)
    for (const candidate of lineCandidates) {
      const isAuthorizePath = (() => {
        try {
          return new URL(candidate).pathname.toLowerCase().includes('/authorize')
        } catch {
          return false
        }
      })()
      candidates.push({ value: candidate, isAuthorizePath })
    }
  }

  const authorizeCandidate = candidates.find(c => c.isAuthorizePath)?.value ?? null
  url = authorizeCandidate ?? candidates[0]?.value ?? null

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
