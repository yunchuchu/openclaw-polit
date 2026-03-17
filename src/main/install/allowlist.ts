const allowedHosts = new Set([
  'nodejs.org'
])

export function assertAllowedUrl(url: string) {
  const parsed = new URL(url)
  if (!allowedHosts.has(parsed.hostname)) {
    throw new Error(`Disallowed download host: ${parsed.hostname}`)
  }
}
