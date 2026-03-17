export function parseDashboardUrl(output: string): string | null {
  const lines = output.split(/\r?\n/)
  for (const line of lines) {
    if (line.trimStart().startsWith('Dashboard URL:')) {
      const match = line.match(/https?:\/\/\S+/)
      return match ? match[0] : null
    }
  }
  return null
}
