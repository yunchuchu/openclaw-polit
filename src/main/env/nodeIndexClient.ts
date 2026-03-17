export type NodeIndexEntry = { version: string; lts: string | null; files: string[] }

export async function fetchNodeIndex(
  fetchImpl: typeof fetch = fetch,
  assertUrl: (url: string) => void = () => {}
): Promise<NodeIndexEntry[]> {
  const url = 'https://nodejs.org/dist/index.json'
  assertUrl(url)
  const res = await fetchImpl(url)
  if (!res.ok) {
    throw new Error(`Node index fetch failed: ${res.status}`)
  }
  return res.json() as Promise<NodeIndexEntry[]>
}
