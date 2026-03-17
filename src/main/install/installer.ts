import path from 'node:path'
import sudo from 'sudo-prompt'
import { downloadToFile } from './downloadManager'
import { extractPortableGit, detectPortableGitRoot } from './portableGit'
import { buildNodeInstallerUrl } from './nodeArtifacts'
import { buildGitPkgUrl } from './gitArtifacts'
import { assertAllowedCommand } from './commandAllowlist'

export const PERMISSION_DENIED = 'PERMISSION_DENIED'

export function runElevated(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    assertAllowedCommand(command)
    sudo.exec(command, { name: 'OpenClaw Installer' }, (error) => {
      if (error) {
        const message = String(error).toLowerCase()
        if (message.includes('denied') || message.includes('cancel')) {
          const err = new Error('Administrator permission is required')
          ;(err as Error & { code?: string }).code = PERMISSION_DENIED
          reject(err)
          return
        }
        reject(error)
        return
      }
      resolve()
    })
  })
}

export function buildSetMachinePathCommand(newPath: string): string {
  return `powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('PATH','${newPath}','Machine')"`
}

export function buildBroadcastEnvChangeCommand(): string {
  return 'powershell -NoProfile -Command "Add-Type -Namespace Win32 -Name NativeMethods -MemberDefinition \' [DllImport(\\"user32.dll\\")] public static extern int SendMessageTimeout(int hWnd,int Msg,int wParam,string lParam,int flags,int timeout,out int result); \' ; [Win32.NativeMethods]::SendMessageTimeout(0xffff,0x1A,0,\'Environment\',2,5000,[ref]0)"'
}

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

export function resolveGitPkgUrl() {
  return buildGitPkgUrl()
}
