import semver from 'semver'
import type { NodeIndexEntry } from './nodeIndexClient'

export function isInstalledLts(version: string, indexJson: NodeIndexEntry[]): boolean {
  return indexJson.some(entry => entry.lts && entry.version === version)
}

export function selectLatestLts(indexJson: NodeIndexEntry[]): NodeIndexEntry {
  const ltsEntries = indexJson.filter(entry => entry.lts)
  if (!ltsEntries.length) {
    throw new Error('No LTS versions found')
  }
  return ltsEntries.sort((a, b) => semver.rcompare(a.version, b.version))[0]
}

export function isMajorAtLeast(version: string, major: number): boolean {
  return semver.major(version) >= major
}
