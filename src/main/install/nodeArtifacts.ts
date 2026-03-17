type Platform = 'win32' | 'darwin'
type Arch = 'x64' | 'arm64'

export function buildNodeInstallerUrl(version: string, platform: Platform, arch: Arch) {
  if (platform === 'win32') {
    return `https://nodejs.org/dist/${version}/node-${version}-${arch}.msi`
  }
  return `https://nodejs.org/dist/${version}/node-${version}.pkg`
}
