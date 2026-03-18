export function parseOAuthOutput(output: string): {
  url: string | null
  userCode: string | null
  error: string | null
} {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[◇│◑]+\s?/, '').trim())
    .filter(Boolean)

  let url: string | null = null
  let userCode: string | null = null

  for (const line of lines) {
    if (!url) {
      const match = line.match(/https?:\/\/\S*authorize\S*/)
      if (match) {
        url = match[0]
      }
    }
    if (!userCode) {
      const codeMatch = line.match(/code\s+([A-Z0-9-]+)/i)
      if (codeMatch) {
        userCode = codeMatch[1]
      }
    }
  }

  const error = url && userCode ? null : 'MISSING_FIELDS'
  return { url, userCode, error }
}
