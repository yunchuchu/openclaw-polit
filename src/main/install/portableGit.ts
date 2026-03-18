import * as node7z from 'node-7z'
import sevenBin from '7zip-bin'
import fs from 'node:fs'
import path from 'node:path'

export async function extractPortableGit(archivePath: string, destDir: string): Promise<void> {
  await new Promise((resolve, reject) => {
    const { extractFull } = node7z as { extractFull: typeof node7z['extractFull'] }
    const stream = extractFull(archivePath, destDir, {
      $bin: sevenBin.path7za
    })
    stream.on('end', resolve)
    stream.on('error', reject)
  })
}

export async function detectPortableGitRoot(destDir: string): Promise<string> {
  const entries = await fs.promises.readdir(destDir)
  const match = entries.find(name => name.toLowerCase().includes('portablegit'))
  if (!match) throw new Error('PortableGit root not found')
  return path.join(destDir, match)
}
