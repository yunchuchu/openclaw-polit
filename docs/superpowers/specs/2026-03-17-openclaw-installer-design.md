# OpenClaw Installer (Electron + Vue) - Design

Date: 2026-03-17

## Summary
Build a macOS + Windows desktop installer using Electron + Vue that ensures Node.js is LTS with major >= 22 and Git is available, installs OpenClaw via npm, starts the gateway, and embeds the dashboard web console inside the app. The flow is fully automated except for unavoidable system permission prompts (UAC / macOS installer authorization).

## Goals
1. Detect presence and versions of Node.js and Git.
2. Ensure Node.js is LTS and major version >= 22; install/upgrade to latest LTS if non-LTS or < 22.
3. Install Git if missing.
4. Prefer package managers (macOS: brew, Windows: winget). If unavailable or fails, fall back to official installers (pkg/msi) where applicable; Windows Git falls back to bundled PortableGit.
5. Run `npm i -g openclaw`.
6. Start `openclaw gateway run` and obtain dashboard URL via `openclaw dashboard --no-open`.
7. Embed the dashboard URL within the Electron app.

## Non-Goals (v1)
1. Offline installation support.
2. Uninstall/cleanup of OpenClaw or system dependencies.
3. Multi-version management or environment switching.

## Target Platforms
- macOS
- Windows

## Key Assumptions
- `openclaw dashboard --no-open` output format is stable and includes a single dashboard URL.
- Official installers support silent install flags (to be verified for macOS pkg and Windows msi).
- Users can grant system permission prompts when required.
- Gateway runs only while the desktop app is open; it stops when the app exits.

## Dependency Policy
- **Node.js**: If Node is missing, non-LTS, or major < 22, upgrade to latest LTS. If LTS and major >= 22, keep existing version.
- **Git (Windows)**: Prefer winget. If winget unavailable or fails, use bundled PortableGit and add it to system PATH.
- **Git (macOS)**: Prefer brew. If brew unavailable or fails, use official pkg installer.

## Installed Node LTS Detection
- Fetch `https://nodejs.org/dist/index.json`.
- The installed Node version is considered LTS if it exactly matches an entry with a non-null `lts` field.
- If no match, treat it as non-LTS and upgrade when policy requires.

## Architecture Overview
**Electron Main Process** handles all system tasks:
- Environment detection
- Package manager strategy
- Downloading installers
- Running commands and supervising processes
- Parsing dashboard URL

**Electron Renderer (Vue)** handles UI:
- Progress steps, logs, errors, retry actions
- Embedded dashboard view (BrowserView/WebView)

## Main Process Modules
1. **EnvDetector**
   - Detects Node and Git availability and versions.
   - Validates “latest LTS” requirement.

2. **PackageManagerStrategy**
   - Determines availability of `brew` or `winget`.
   - Chooses install path (package manager or fallback installer).

3. **Installer**
   - Performs installation for Node/Git.
   - Handles privileges and checks results.

4. **DownloadManager**
   - Fetches official installers.
   - Provides progress and retry support.

5. **OpenClawManager**
   - Runs `npm i -g openclaw`.
   - Starts/stops gateway.
   - Executes `openclaw dashboard --no-open` and parses URL.

6. **ProcessSupervisor**
   - Manages subprocess lifecycle and logging.
   - Captures stdout/stderr for UI.

## UI (Renderer) Structure
- **Install Screen**: stepper, status, progress, log summary, retry button.
- **Dashboard Screen**: embedded web console using the parsed URL.

## Data Flow (Happy Path)
1. App launches → EnvDetector runs.
2. If Node/Git missing → PackageManagerStrategy selects install path.
3. Install Node/Git (brew/winget or pkg/msi).
4. Re-check environment to confirm success.
5. Install OpenClaw globally with npm.
6. Start gateway and parse dashboard URL.
7. Renderer navigates to embedded dashboard.

## Latest LTS Resolution (Node.js)
- Source: `https://nodejs.org/dist/index.json`
- Select the newest entry with a non-null `lts` field.
- Download artifacts:
  - Windows: `node-v{version}-x64.msi` (or arm64 if detected)
  - macOS: `node-v{version}.pkg`

## Package Manager Commands
- **macOS (brew)**:
  - Node: `brew install node@{ltsMajor}` if available, otherwise fall back to pkg.
  - Git: `brew install git`
- **Windows (winget)**:
  - Node LTS: `winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements --silent`
  - Git: `winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements --silent`

## Silent Install Strategy
- **Windows Node MSI**: `msiexec /i <msi> /qn /norestart`
- **Windows Git (Portable)**: extract bundled archive to a fixed location and add to machine PATH.
- **macOS PKG**: `installer -pkg <pkg> -target /`

## Windows PATH Update (Portable Git)
- Write to machine PATH (HKLM) and broadcast `WM_SETTINGCHANGE` so new shells pick up changes.
- Requires admin privileges; UI informs user when UAC prompt appears.

## Global npm Install Strategy
- Run `npm i -g openclaw`.
- If macOS returns EACCES, set `npm config set prefix ~/.openclaw/npm-global`, update PATH for the app process and the user’s shell profile, then retry.
- On Windows, ensure `%APPDATA%\\npm` is on PATH (add if missing) before retrying.

## Dashboard URL Parsing Contract
Use the first URL on the line that starts with `Dashboard URL:` in the `openclaw dashboard --no-open` output. Example:

```
🦞 OpenClaw 2026.3.12 (6472949)
   Less clicking, more shipping, fewer "where did that file go" moments.

Dashboard URL: http://127.0.0.1:18789/#token=c87410bce1c5015a3abad2eaa8de52d6385a3255dde6
Copied to clipboard.
Browser launch disabled (--no-open). Use the URL above.
```

Expected parse result:
`http://127.0.0.1:18789/#token=c87410bce1c5015a3abad2eaa8de52d6385a3255dde6`

## Error Handling
- Every stage emits a clear error code + user-friendly message.
- UI offers retry and log copy.
- Failures in package manager route automatically fall back to official installer route.
- If admin permission is denied (UAC/macOS authorization), the step fails fast and the UI explains that elevated privileges are required to proceed.

## Security & Safety
- Only trusted official download URLs are allowed (whitelisted).
- Dashboard token is not persisted; kept only in runtime memory.
- All system commands executed in Main process with explicit allowlist.

## Official Download Sources (Allowlist)
- Node.js: `nodejs.org`
- Git for Windows: `git-scm.com`
- Git for macOS: `git-scm.com`

## Testing & Acceptance
**Acceptance Criteria**
1. Fresh macOS install completes successfully end-to-end.
2. Fresh Windows install completes successfully end-to-end.
3. Failure at any step shows clear error + retry.
4. Dashboard URL parses reliably from `openclaw dashboard --no-open` output.

**Testing Scope**
- Unit tests for URL parser and env detection.
- Manual validation on macOS and Windows.

## Open Questions / To Verify
1. Exact portable Git bundle version to ship in app resources.
2. Confirm Git for macOS pkg URL pattern and any signing requirements.
