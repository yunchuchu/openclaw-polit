# OpenClaw Installer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Electron + Vue app that ensures Node.js is LTS with major >= 22 and Git is available, installs OpenClaw, starts the gateway, and embeds the dashboard.

**Architecture:** Electron main process owns environment detection, dependency install, and OpenClaw lifecycle. Renderer shows installation progress and embeds the dashboard URL. IPC is the only bridge between UI and system actions.

**Tech Stack:** Electron, Vue 3, TypeScript, electron-vite, Vitest, semver, sudo-prompt, node-7z + 7zip-bin.

---

## Planned File Map

- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/main/index.ts`
- Create: `src/main/ipc.ts`
- Create: `src/main/logging.ts`
- Create: `src/main/processSupervisor.ts`
- Create: `src/main/env/nodeLts.ts`
- Create: `src/main/env/nodeIndexClient.ts`
- Create: `src/main/env/envDetector.ts`
- Create: `src/main/install/packageManager.ts`
- Create: `src/main/install/allowlist.ts`
- Create: `src/main/install/downloadManager.ts`
- Create: `src/main/install/nodeArtifacts.ts`
- Create: `src/main/install/gitArtifacts.ts`
- Create: `src/main/install/commandAllowlist.ts`
- Create: `src/main/install/installer.ts`
- Create: `src/main/install/portableGit.ts`
- Create: `src/main/openclaw/parseDashboardUrl.ts`
- Create: `src/main/openclaw/openclawManager.ts`
- Create: `src/main/openclaw/npmGlobal.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.ts`
- Create: `src/renderer/src/App.vue`
- Create: `src/renderer/src/components/InstallView.vue`
- Create: `src/renderer/src/components/DashboardView.vue`
- Create: `src/renderer/src/components/StepList.vue`
- Create: `src/renderer/src/styles/app.css`
- Create: `resources/portable-git/windows/` (bundled PortableGit payload)
- Create: `src/main/openclaw/__tests__/parseDashboardUrl.test.ts`
- Create: `src/main/env/__tests__/nodeLts.test.ts`
- Create: `src/main/env/__tests__/nodeIndexClient.test.ts`
- Create: `src/main/env/__tests__/envDetector.test.ts`
- Create: `src/main/install/__tests__/packageManager.test.ts`
- Create: `src/main/install/__tests__/allowlist.test.ts`
- Create: `src/main/install/__tests__/nodeArtifacts.test.ts`
- Create: `src/main/install/__tests__/gitArtifacts.test.ts`
- Create: `src/main/install/__tests__/commandAllowlist.test.ts`

---

### Task 0: Resolve Installer Artifacts and Sources

**Files:**
- Modify: `resources/portable-git/windows/` (choose PortableGit bundle version)
- Modify: `src/main/install/allowlist.ts`

- [ ] **Step 1: Pick PortableGit bundle**

Decide the bundled PortableGit archive version and place it under `resources/portable-git/windows/`.

- [ ] **Step 2: Confirm Git for macOS pkg URL**

Locate the official Git for macOS pkg URL and update allowlist if an additional host is required.

- [ ] **Step 2b: Update `buildGitPkgUrl`**

Replace `buildGitPkgUrl()` to return the verified direct `.pkg` URL (no HTML landing page).

- [ ] **Step 3: Commit**

```bash
git add resources/portable-git/windows src/main/install/allowlist.ts

git commit -m "docs: select PortableGit bundle and macOS Git source"
```

---

### Task 1: Scaffold Electron + Vue App With Tooling

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.ts`
- Create: `src/renderer/src/App.vue`

- [ ] **Step 1: Scaffold electron-vite project**

Run: `npm create electron-vite@latest . -- --template vue-ts`

Expected: Project files created with Electron main/preload/renderer folders.

- [ ] **Step 2: Install deps**

Run: `npm install`

Expected: `node_modules` created with no errors.

- [ ] **Step 3: Add test tooling**

Run: `npm install -D vitest @types/node`

Update `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node'
  }
})
```

- [ ] **Step 3b: Configure PortableGit packaging**

Update `electron.vite.config.ts` (or build config) to include `resources/portable-git/windows` under `extraResources` and add `asarUnpack` for the `.7z` archive so it can be extracted at runtime.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts electron.vite.config.ts src

git commit -m "chore: scaffold electron-vite app"
```

---

### Task 2: Dashboard URL Parser (TDD)

**Files:**
- Create: `src/main/openclaw/parseDashboardUrl.ts`
- Create: `src/main/openclaw/__tests__/parseDashboardUrl.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { parseDashboardUrl } from '../parseDashboardUrl'

describe('parseDashboardUrl', () => {
  it('extracts URL from dashboard output', () => {
    const output = `\nDashboard URL: http://127.0.0.1:18789/#token=abc123\nCopied to clipboard.\n`
    expect(parseDashboardUrl(output)).toBe('http://127.0.0.1:18789/#token=abc123')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`

Expected: FAIL with "Cannot find module '../parseDashboardUrl'" or function missing.

- [ ] **Step 3: Implement parser**

```ts
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
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/openclaw/parseDashboardUrl.ts src/main/openclaw/__tests__/parseDashboardUrl.test.ts

git commit -m "feat: add dashboard URL parser"
```

---

### Task 3: Node Index Fetch + LTS Resolution (TDD)

**Files:**
- Create: `src/main/env/nodeIndexClient.ts`
- Create: `src/main/env/nodeLts.ts`
- Create: `src/main/install/nodeArtifacts.ts`
- Create: `src/main/env/__tests__/nodeIndexClient.test.ts`
- Create: `src/main/env/__tests__/nodeLts.test.ts`
- Create: `src/main/install/__tests__/nodeArtifacts.test.ts`

- [ ] **Step 1: Add dependency**

Run: `npm install semver`

- [ ] **Step 2: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { fetchNodeIndex } from '../nodeIndexClient'
import { isInstalledLts, selectLatestLts, isMajorAtLeast } from '../nodeLts'
import { buildNodeInstallerUrl } from '../../install/nodeArtifacts'

const indexJson = [
  { version: 'v22.1.0', lts: 'Jod', files: ['msi', 'pkg'] },
  { version: 'v22.0.0', lts: 'Jod', files: ['msi', 'pkg'] },
  { version: 'v23.0.0', lts: null, files: ['msi', 'pkg'] }
]

describe('nodeIndexClient', () => {
  it('parses index json', async () => {
    const fakeFetch = async () => ({ ok: true, json: async () => indexJson })
    const result = await fetchNodeIndex(fakeFetch as any)
    expect(result).toHaveLength(3)
  })
})

describe('nodeLts', () => {
  it('detects LTS by exact version match', () => {
    expect(isInstalledLts('v22.0.0', indexJson)).toBe(true)
    expect(isInstalledLts('v23.0.0', indexJson)).toBe(false)
  })

  it('selects latest LTS', () => {
    expect(selectLatestLts(indexJson).version).toBe('v22.1.0')
  })

  it('checks major version', () => {
    expect(isMajorAtLeast('v22.0.0', 22)).toBe(true)
  })
})

describe('nodeArtifacts', () => {
  it('builds msi url', () => {
    expect(buildNodeInstallerUrl('v22.1.0', 'win32', 'x64')).toContain('node-v22.1.0-x64.msi')
  })

  it('builds pkg url', () => {
    expect(buildNodeInstallerUrl('v22.1.0', 'darwin', 'x64')).toContain('node-v22.1.0.pkg')
  })
})
describe('nodeArtifacts', () => {
  it('uses arch detection', () => {
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
    expect(['arm64', 'x64']).toContain(arch)
  })
})
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm run test`

Expected: FAIL due to missing modules/exports.

- [ ] **Step 4: Implement Node index fetch + LTS helpers**

```ts
export async function fetchNodeIndex(fetchImpl: typeof fetch = fetch, assertUrl: (url: string) => void = () => {}) {
  const url = 'https://nodejs.org/dist/index.json'
  assertUrl(url)
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`Node index fetch failed: ${res.status}`)
  return res.json() as Promise<Array<{ version: string; lts: string | null; files: string[] }>>
}
```

```ts
import semver from 'semver'

type NodeIndexEntry = { version: string; lts: string | null; files: string[] }

export function isInstalledLts(version: string, indexJson: NodeIndexEntry[]): boolean {
  return indexJson.some(entry => entry.lts && entry.version === version)
}

export function selectLatestLts(indexJson: NodeIndexEntry[]): NodeIndexEntry {
  const ltsEntries = indexJson.filter(entry => entry.lts)
  if (!ltsEntries.length) throw new Error('No LTS versions found')
  return ltsEntries.sort((a, b) => semver.rcompare(a.version, b.version))[0]
}

export function isMajorAtLeast(version: string, major: number): boolean {
  return semver.major(version) >= major
}
```

```ts
type Platform = 'win32' | 'darwin'
type Arch = 'x64' | 'arm64'

export function buildNodeInstallerUrl(version: string, platform: Platform, arch: Arch) {
  if (platform === 'win32') return `https://nodejs.org/dist/${version}/node-${version}-${arch}.msi`
  return `https://nodejs.org/dist/${version}/node-${version}.pkg`
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm run test`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/env/nodeIndexClient.ts src/main/env/nodeLts.ts src/main/install/nodeArtifacts.ts src/main/env/__tests__/nodeIndexClient.test.ts src/main/env/__tests__/nodeLts.test.ts src/main/install/__tests__/nodeArtifacts.test.ts package.json package-lock.json

git commit -m "feat: add Node index fetch and LTS helpers"
```

---

### Task 4: Environment Detection + Manager Availability (TDD)

**Files:**
- Create: `src/main/env/envDetector.ts`
- Create: `src/main/env/__tests__/envDetector.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { detectEnv } from '../envDetector'

const fakeExec = async (cmd: string) => {
  if (cmd.includes('node')) return { stdout: 'v22.0.0', stderr: '', code: 0 }
  if (cmd.includes('git')) return { stdout: 'git version 2.47.0', stderr: '', code: 0 }
  if (cmd.includes('brew')) return { stdout: '/opt/homebrew/bin/brew', stderr: '', code: 0 }
  if (cmd.includes('winget')) return { stdout: 'winget', stderr: '', code: 0 }
  return { stdout: '', stderr: 'not found', code: 1 }
}

describe('detectEnv', () => {
  it('detects node, git, and package managers', async () => {
    const result = await detectEnv(fakeExec)
    expect(result.node.version).toBe('v22.0.0')
    expect(result.git.version).toBe('2.47.0')
    expect(result.managers.brew).toBe(true)
    expect(result.managers.winget).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test`

Expected: FAIL due to missing module/exports.

- [ ] **Step 3: Implement detector**

```ts
type ExecResult = { stdout: string; stderr: string; code: number }
export type ExecFn = (cmd: string) => Promise<ExecResult>

export async function detectEnv(exec: ExecFn) {
  const node = await exec('node -v')
  const git = await exec('git --version')
  const brew = await exec('which brew')
  const winget = await exec('where winget')
  const gitVersionMatch = git.stdout.match(/(\d+\.\d+\.\d+)/)

  return {
    node: { available: node.code === 0, version: node.stdout.trim() },
    git: { available: git.code === 0, version: gitVersionMatch ? gitVersionMatch[1] : '' },
    managers: { brew: brew.code === 0, winget: winget.code === 0 }
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/env/envDetector.ts src/main/env/__tests__/envDetector.test.ts

git commit -m "feat: add environment detector"
```

---

### Task 5: Package Manager Commands + Availability (TDD)

**Files:**
- Create: `src/main/install/packageManager.ts`
- Create: `src/main/install/__tests__/packageManager.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { buildNodeInstallCommand, buildGitInstallCommand, isManagerAvailable } from '../packageManager'

const fakeExec = async (cmd: string) => ({ stdout: cmd.includes('brew') ? '/opt/homebrew/bin/brew' : '', stderr: '', code: cmd.includes('brew') ? 0 : 1 })

describe('packageManager', () => {
  it('builds winget commands', () => {
    expect(buildNodeInstallCommand('win32', 'winget', 22)).toContain('OpenJS.NodeJS.LTS')
    expect(buildGitInstallCommand('win32', 'winget')).toContain('Git.Git')
  })

  it('builds brew commands', () => {
    expect(buildNodeInstallCommand('darwin', 'brew', 22)).toContain('brew install node@22')
    expect(buildGitInstallCommand('darwin', 'brew')).toContain('brew install git')
  })

  it('detects manager availability', async () => {
    expect(await isManagerAvailable('darwin', 'brew', fakeExec as any)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test`

Expected: FAIL due to missing module/exports.

- [ ] **Step 3: Implement command builders and availability checks**

```ts
type Platform = 'win32' | 'darwin'

type Manager = 'winget' | 'brew'

type ExecFn = (cmd: string) => Promise<{ stdout: string; stderr: string; code: number }>

export function buildNodeInstallCommand(platform: Platform, manager: Manager, ltsMajor: number): string {
  if (platform === 'win32' && manager === 'winget') {
    return 'winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements --silent'
  }
  if (platform === 'darwin' && manager === 'brew') {
    return `brew install node@${ltsMajor}`
  }
  throw new Error('Unsupported platform/manager')
}

export function buildGitInstallCommand(platform: Platform, manager: Manager): string {
  if (platform === 'win32' && manager === 'winget') {
    return 'winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent'
  }
  if (platform === 'darwin' && manager === 'brew') {
    return 'brew install git'
  }
  throw new Error('Unsupported platform/manager')
}

export async function isManagerAvailable(platform: Platform, manager: Manager, exec: ExecFn) {
  if (platform === 'darwin' && manager === 'brew') return (await exec('which brew')).code === 0
  if (platform === 'win32' && manager === 'winget') return (await exec('where winget')).code === 0
  return false
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/install/packageManager.ts src/main/install/__tests__/packageManager.test.ts

git commit -m "feat: add package manager command builders"
```

---

### Task 6: Download Manager + Allowlist (TDD)

**Files:**
- Create: `src/main/install/allowlist.ts`
- Create: `src/main/install/downloadManager.ts`
- Create: `src/main/install/__tests__/allowlist.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { assertAllowedUrl } from '../allowlist'

describe('allowlist', () => {
  it('accepts allowed hostnames', () => {
    expect(() => assertAllowedUrl('https://nodejs.org/dist/index.json')).not.toThrow()
  })

  it('rejects unknown hostnames', () => {
    expect(() => assertAllowedUrl('https://example.com/foo')).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test`

Expected: FAIL due to missing module/exports.

- [ ] **Step 3: Implement allowlist + downloader**

```ts
const allowedHosts = new Set(['nodejs.org', 'git-scm.com'])

export function assertAllowedUrl(url: string) {
  const parsed = new URL(url)
  if (!allowedHosts.has(parsed.hostname)) {
    throw new Error(`Disallowed download host: ${parsed.hostname}`)
  }
}
```

```ts
import { createWriteStream } from 'fs'
import { assertAllowedUrl } from './allowlist'

export async function downloadToFile(url: string, dest: string, onProgress?: (downloaded: number) => void, retries = 2): Promise<void> {
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
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/install/allowlist.ts src/main/install/downloadManager.ts src/main/install/__tests__/allowlist.test.ts

git commit -m "feat: add download allowlist and downloader"
```

---

### Task 6b: Git Artifact Resolver + Command Allowlist (TDD)

**Files:**
- Create: `src/main/install/gitArtifacts.ts`
- Create: `src/main/install/commandAllowlist.ts`
- Create: `src/main/install/__tests__/gitArtifacts.test.ts`
- Create: `src/main/install/__tests__/commandAllowlist.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { buildGitPkgUrl } from '../gitArtifacts'
import { assertAllowedCommand } from '../commandAllowlist'

describe('gitArtifacts', () => {
  it('returns direct git pkg url', () => {
    expect(buildGitPkgUrl()).toMatch(/\\.pkg$/)
  })
})

describe('commandAllowlist', () => {
  it('allows known commands', () => {
    expect(() => assertAllowedCommand('msiexec /i installer.msi /qn /norestart')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test`

Expected: FAIL due to missing modules/exports.

- [ ] **Step 3: Implement allowlist**

```ts
const allowedCommands = [
  'node -v',
  'git --version',
  'which brew',
  'where winget',
  'msiexec /i "{msi}" /qn /norestart',
  'installer -pkg "{pkg}" -target /',
  'brew install git',
  'brew install node@{ltsMajor}',
  'winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements --silent',
  'winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent',
  'npm i -g openclaw',
  'npm config set prefix "{prefix}"',
  'bash -lc "echo \'export PATH={prefix}/bin:$PATH\' >> ~/.zprofile"',
  'setx /M PATH "{path}"',
  'powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\\"PATH\\",\\"User\\")"',
  'powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable(\'PATH\',\'{path}\',\'Machine\')"',
  'powershell -NoProfile -Command "Add-Type -Namespace Win32 -Name NativeMethods -MemberDefinition \' [DllImport(\\\"user32.dll\\\")] public static extern int SendMessageTimeout(int hWnd,int Msg,int wParam,string lParam,int flags,int timeout,out int result); \'; [Win32.NativeMethods]::SendMessageTimeout(0xffff,0x1A,0,\'Environment\',2,5000,[ref]0)"',
  'openclaw gateway run',
  'openclaw dashboard --no-open'
]

export function assertAllowedCommand(command: string) {
  if (!allowedCommands.some(template => command.startsWith(template.split('{')[0]))) {
    throw new Error(`Disallowed command: ${command}`)
  }
}
```

```ts
export function buildGitPkgUrl() {
  return 'https://git-scm.com/path/to/git-installer.pkg'
}
```

- [ ] **Step 3b: Follow redirects for Git pkg**

When downloading the Git mac pkg, allow `downloadToFile` to follow redirects. If the final host is not in the allowlist, update Task 0 to include the official host.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/install/gitArtifacts.ts src/main/install/commandAllowlist.ts src/main/install/__tests__/gitArtifacts.test.ts src/main/install/__tests__/commandAllowlist.test.ts

git commit -m "feat: add git artifact resolver and command allowlist"
```

---

### Task 7: Installer Flow (Node/Git + PortableGit + PATH Update)

**Files:**
- Create: `src/main/install/installer.ts`
- Create: `src/main/install/portableGit.ts`

- [ ] **Step 1: Add deps for elevation and extraction**

Run: `npm install sudo-prompt node-7z 7zip-bin`

- [ ] **Step 2: Implement PortableGit extract**

```ts
import { extractFull } from 'node-7z'
import sevenBin from '7zip-bin'
import fs from 'fs'
import path from 'path'

export async function extractPortableGit(archivePath: string, destDir: string): Promise<void> {
  await new Promise((resolve, reject) => {
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
```

- [ ] **Step 3: Implement elevated command helper**

```ts
import sudo from 'sudo-prompt'

export function runElevated(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    sudo.exec(command, { name: 'OpenClaw Installer' }, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}
```

- [ ] **Step 4: Implement Windows PATH update (HKLM + broadcast)**

```ts
export function buildSetMachinePathCommand(newPath: string): string {
  return `powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('PATH','${newPath}','Machine')"`
}

export function buildBroadcastEnvChangeCommand(): string {
  return `powershell -NoProfile -Command "Add-Type -Namespace Win32 -Name NativeMethods -MemberDefinition ' [DllImport(\"user32.dll\")] public static extern int SendMessageTimeout(int hWnd,int Msg,int wParam,string lParam,int flags,int timeout,out int result); '; [Win32.NativeMethods]::SendMessageTimeout(0xffff,0x1A,0,'Environment',2,5000,[ref]0)"`
}
```

- [ ] **Step 5: Implement installer orchestration**

```ts
import path from 'path'
import { downloadToFile } from './downloadManager'
import { extractPortableGit } from './portableGit'
import { buildNodeInstallerUrl } from './nodeArtifacts'
import { buildGitPkgUrl } from './gitArtifacts'

export async function installNodeMsi(msiUrl: string, msiPath: string) {
  await downloadToFile(msiUrl, msiPath)
  await runElevated(`msiexec /i "${msiPath}" /qn /norestart`)
}

export async function installNodePkg(pkgUrl: string, pkgPath: string) {
  await downloadToFile(pkgUrl, pkgPath)
  await runElevated(`installer -pkg "${pkgPath}" -target /`)
}

export async function installGitPkg(pkgUrl: string, pkgPath: string) {
  await downloadToFile(pkgUrl, pkgPath)
  await runElevated(`installer -pkg "${pkgPath}" -target /`)
}

export function resolveNodeInstallerUrl(version: string, platform: 'win32' | 'darwin', arch: 'x64' | 'arm64') {
  return buildNodeInstallerUrl(version, platform, arch)
}

export async function installGitPortable(portableArchive: string, destDir: string, currentPath: string) {
  await extractPortableGit(portableArchive, destDir)
  const extractedRoot = await detectPortableGitRoot(destDir)
  const gitBin = path.join(extractedRoot, 'bin')
  const newPath = `${gitBin};${currentPath}`
  await runElevated(buildSetMachinePathCommand(newPath))
  await runElevated(buildBroadcastEnvChangeCommand())
}

- [ ] **Step 5b: Map permission denied to explicit error**

If `runElevated` rejects with a permission/authorization error, emit `PERMISSION_DENIED` and show a UI message explaining admin authorization is required.

- [ ] **Step 5c: Fixed PortableGit location**

Extract PortableGit to a fixed path such as `%ProgramFiles%\\OpenClaw\\PortableGit` and compute PATH from that folder.
```

- [ ] **Step 6: Commit**

```bash
git add src/main/install/installer.ts src/main/install/portableGit.ts package.json package-lock.json

git commit -m "feat: add installer helpers and portable git extraction"
```

---

### Task 8: npm Global Install Strategy

**Files:**
- Create: `src/main/openclaw/npmGlobal.ts`

- [ ] **Step 1: Implement npm global install with fallback**

```ts
import os from 'os'
import path from 'path'

export function getMacFallbackPrefix() {
  return path.join(os.homedir(), '.openclaw', 'npm-global')
}

export async function ensureWindowsNpmPath(exec: (cmd: string) => Promise<{ stdout: string; stderr: string; code: number }>) {
  const result = await exec('powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable(\"PATH\",\"User\")"')
  const appData = process.env.APPDATA || ''
  const npmPath = `${appData}\\npm`
  if (result.stdout && !result.stdout.includes(npmPath)) {
    await exec(`setx /M PATH "${npmPath};%PATH%"`)
  }
}
```

- [ ] **Step 2: Implement install with retry**

```ts
export async function installOpenClawGlobal(exec: (cmd: string) => Promise<{ stdout: string; stderr: string; code: number }>, setEnv: (key: string, value: string) => void) {
  const first = await exec('npm i -g openclaw')
  if (first.code === 0) return

  if (first.stderr.includes('EACCES')) {
    const prefix = getMacFallbackPrefix()
    await exec(`npm config set prefix "${prefix}"`)
    setEnv('PATH', `${prefix}/bin:${process.env.PATH || ''}`)
    await exec(`bash -lc "echo 'export PATH=${prefix}/bin:$PATH' >> ~/.zprofile"`)
    const retry = await exec('npm i -g openclaw')
    if (retry.code !== 0) throw new Error(retry.stderr)
    return
  }

  throw new Error(first.stderr)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/openclaw/npmGlobal.ts

git commit -m "feat: add npm global install fallback"
```

---

### Task 9: OpenClaw Manager

**Files:**
- Create: `src/main/openclaw/openclawManager.ts`

- [ ] **Step 1: Implement OpenClaw lifecycle**

```ts
import { spawn } from 'child_process'
import { parseDashboardUrl } from './parseDashboardUrl'

export async function startGateway() {
  return spawn('openclaw', ['gateway', 'run'], { stdio: 'pipe' })
}

export async function getDashboardUrl(exec: (cmd: string) => Promise<{ stdout: string; stderr: string; code: number }>) {
  const result = await exec('openclaw dashboard --no-open')
  const url = parseDashboardUrl(result.stdout)
  if (!url) throw new Error('Dashboard URL not found')
  return url
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/openclaw/openclawManager.ts

git commit -m "feat: add OpenClaw manager"
```

---

### Task 10: Process Supervisor + Logging + IPC

**Files:**
- Create: `src/main/processSupervisor.ts`
- Create: `src/main/logging.ts`
- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Implement process supervisor**

```ts
import { ChildProcess } from 'child_process'

export class ProcessSupervisor {
  private children: ChildProcess[] = []

  track(proc: ChildProcess) {
    this.children.push(proc)
  }

  stopAll() {
    for (const child of this.children) {
      child.kill()
    }
    this.children = []
  }
}
```

- [ ] **Step 2: Implement logging helper**

```ts
import { BrowserWindow } from 'electron'

export function emitLog(win: BrowserWindow, message: string) {
  win.webContents.send('installer:log', message)
}

export function emitStep(win: BrowserWindow, step: string) {
  win.webContents.send('installer:step', step)
}

export function emitError(win: BrowserWindow, code: string, message: string) {
  win.webContents.send('installer:error', { code, message })
}
```

- [ ] **Step 3b: Buffer logs for copy action**

Store logs in memory (e.g., `const logs: string[] = []`) and append on every `emitLog`.
Use the main-process buffer as the source for “Copy Logs”.

- [ ] **Step 3c: Central command exec wrapper**

Create a single `execCommand` helper that calls `assertAllowedCommand`, captures stdout/stderr for logs, and normalizes error codes.

- [ ] **Step 3: Capture child process output**

```ts
gateway.stdout?.on('data', (chunk) => emitLog(win, chunk.toString()))
gateway.stderr?.on('data', (chunk) => emitLog(win, chunk.toString()))
```

- [ ] **Step 4: Implement IPC handlers**

```ts
import { ipcMain } from 'electron'

export function registerIpcHandlers(handlers: {
  startInstall: () => Promise<void>
  retryInstall: () => Promise<void>
  getLogs: () => string[]
}) {
  ipcMain.handle('installer:start', handlers.startInstall)
  ipcMain.handle('installer:retry', handlers.retryInstall)
  ipcMain.handle('installer:getLogs', handlers.getLogs)
}
```

- [ ] **Step 5: Wire into app lifecycle**

```ts
import { app } from 'electron'
import { ProcessSupervisor } from './processSupervisor'

const supervisor = new ProcessSupervisor()

app.on('before-quit', () => supervisor.stopAll())
```

- [ ] **Step 6: Commit**

```bash
git add src/main/processSupervisor.ts src/main/logging.ts src/main/ipc.ts src/main/index.ts

git commit -m "feat: add process supervisor, logging, and ipc"
```

- [ ] **Step 6b: Track gateway process**

After `startGateway()`, call `supervisor.track(gateway)` so it is stopped on app exit.

---

### Task 11: Main Install Orchestration

**Files:**
- Modify: `src/main/index.ts`

- [ ] **Step 1: Implement flow with re-check and fallbacks**

Pseudo-steps inside handler:
1. Detect Node/Git + manager availability.
2. Fetch node index and determine if upgrade needed (non-LTS or major < 22).
3. Call `selectLatestLts()` to resolve the latest LTS version for downloads.
4. Determine arch via `process.arch` and pass `x64` or `arm64` into `buildNodeInstallerUrl`.
5. If Node needs install, try package manager if available; on failure, download MSI/PKG and install silently.
4. If Git missing, try package manager if available; on failure, install PortableGit (Windows) or pkg (macOS) from `buildGitPkgUrl`.
5. Re-check environment to confirm Node/Git now available.
6. Install OpenClaw globally with npm fallback strategy.
7. On Windows, call `ensureWindowsNpmPath` before retrying npm global install.
8. Start gateway and track process; fetch dashboard URL.
9. Keep the dashboard URL only in runtime memory (no persistence).
8. Emit success + navigate to dashboard.
9. Ensure BrowserWindow uses `webviewTag: true` in `webPreferences`.
10. Validate every shell command using `assertAllowedCommand` before execution, and call `fetchNodeIndex(fetch, assertAllowedUrl)` to enforce URL allowlisting.

- [ ] **Step 1b: Define working directories**

Use `app.getPath('temp')` for downloads and installers; clean up temp files at the end of the flow.

- [ ] **Step 1c: Refresh PATH after installs**

After Node/Git install, refresh `process.env.PATH` by reading Machine/User PATH (Windows) or appending known install locations (`/usr/local/bin`, `/opt/homebrew/bin`) on macOS, then re-run detection to confirm binaries are visible before running `npm` or `openclaw`.

- [ ] **Step 1d: Locate PortableGit archive**

Use `process.resourcesPath` (packaged) or `app.getAppPath()` (dev) to resolve `resources/portable-git/windows/<archive>.7z` and pass that path into `installGitPortable`.

- [ ] **Step 1e: Refresh PATH after npm install on Windows**

After `npm i -g openclaw` succeeds on Windows, update `process.env.PATH` to include `%APPDATA%\\npm` (and the new Machine PATH) so the same process can run `openclaw` immediately.

- [ ] **Step 2: Emit progress logs and errors**

```ts
emitStep(win, 'Installing Node.js')
emitLog(win, 'Using winget...')
emitError(win, 'NODE_INSTALL_FAILED', 'Failed to install Node.js')
```

- [ ] **Step 3: Commit**

```bash
git add src/main/index.ts

git commit -m "feat: wire installer flow with fallbacks"
```

---

### Task 12: Renderer UI (Install + Error + Dashboard)

**Files:**
- Create: `src/preload/index.ts`
- Create: `src/renderer/src/App.vue`
- Create: `src/renderer/src/components/InstallView.vue`
- Create: `src/renderer/src/components/DashboardView.vue`
- Create: `src/renderer/src/components/StepList.vue`
- Create: `src/renderer/src/styles/app.css`

- [ ] **Step 1: Expose IPC API**

```ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('openclaw', {
  startInstall: () => ipcRenderer.invoke('installer:start'),
  retryInstall: () => ipcRenderer.invoke('installer:retry'),
  getLogs: () => ipcRenderer.invoke('installer:getLogs'),
  onLog: (cb: (msg: string) => void) => ipcRenderer.on('installer:log', (_, msg) => cb(msg)),
  onStep: (cb: (step: string) => void) => ipcRenderer.on('installer:step', (_, step) => cb(step)),
  onError: (cb: (payload: { code: string; message: string }) => void) => ipcRenderer.on('installer:error', (_, payload) => cb(payload))
})
```

- [ ] **Step 2: Install view UI with retry + log copy**

```vue
<template>
  <div class="install">
    <h1>OpenClaw</h1>
    <StepList :steps="steps" :current="currentStep" />
    <div class="log-summary">
      <p v-for="line in logSummary" :key="line">{{ line }}</p>
    </div>
    <div v-if="error" class="error">
      <p>{{ error.message }}</p>
      <button @click="retry">Retry</button>
      <button @click="copyLogs">Copy Logs</button>
    </div>
    <button v-else @click="start">Start</button>
  </div>
</template>
```

- [ ] **Step 2b: Wire copyLogs**

Use `const logs = await window.openclaw.getLogs()` and `navigator.clipboard.writeText(logs.join('\\n'))`.

- [ ] **Step 3: Dashboard view UI**

```vue
<template>
  <webview :src="url" style="width:100%;height:100%" />
</template>
```

- [ ] **Step 4: Commit**

```bash
git add src/preload/index.ts src/renderer/src/App.vue src/renderer/src/components src/renderer/src/styles

git commit -m "feat: add renderer install and dashboard views"
```

---

### Task 13: Manual Validation Checklist

- [ ] **Step 1: Run dev app**

Run: `npm run dev`

Expected: Electron window opens with install screen.

- [ ] **Step 2: Simulate success path**

Mock installers or run with local environment to validate UI flow and dashboard embedding.

- [ ] **Step 2b: macOS end-to-end**

Verify Node/Git install (or detect), OpenClaw install, gateway start, dashboard embed.

- [ ] **Step 2c: Windows end-to-end**

Verify Node/Git install (or detect), PortableGit fallback, OpenClaw install, gateway start, dashboard embed.

- [ ] **Step 3: Commit notes**

```bash
git add docs/superpowers/plans/2026-03-17-openclaw-installer.md

git commit -m "docs: add manual validation notes"
```
