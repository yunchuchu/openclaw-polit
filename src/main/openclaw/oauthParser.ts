export function parseOAuthOutput(output: string): {
  url: string | null
  userCode: string | null
  error: string | null
} {
  const lines = output.split(/\r?\n/).map(line => line.replace(/^\s*[◇│◑]+\s?/, '').trim())
  let url: string | null = null
  let userCode: string | null = null

  for (const line of lines) {
    if (!url) {
      const match = line.match(/https?:\/\/\S*authorize\S*/)
      if (match) {
        url = match[0]
        if (!userCode) {
          try {
            const params = new URL(url).searchParams
            userCode = params.get('user_code')
          } catch (err) {
            ;// ignore invalid url for now
          }
        }
      }
    }
    if (!userCode) {
      const codeMatch = line.match(/enter the code\s+([A-Z0-9-]+)/i)
      if (codeMatch) userCode = codeMatch[1]
    }
  }

  const error = url && userCode ? null : 'MISSING_FIELDS'
  return { url, userCode, error }
}
