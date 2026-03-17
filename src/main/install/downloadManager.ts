import { createWriteStream } from 'node:fs'
import { assertAllowedUrl } from './allowlist'

export async function downloadToFile(
  url: string,
  dest: string,
  onProgress?: (downloaded: number) => void,
  retries = 2
): Promise<void> {
  assertAllowedUrl(url)
  let attempt = 0
  while (true) {
    const res = await fetch(url)
    if (res.ok && res.body) {
      const finalUrl = res.url
      assertAllowedUrl(finalUrl)
      const file = createWriteStream(dest)
      const reader = res.body.getReader()
      let downloaded = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        downloaded += value.length
        onProgress?.(downloaded)
        file.write(value)
      }
      file.end()
      return
    }
    if (attempt >= retries) throw new Error(`Download failed: ${res.status}`)
    attempt += 1
  }
}
