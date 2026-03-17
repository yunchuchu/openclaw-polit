const allowedCommands = [
  'node -v',
  'git --version',
  'which brew',
  'where winget',
  'msiexec /i ',
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
  'powershell -NoProfile -Command "Add-Type -Namespace Win32 -Name NativeMethods -MemberDefinition \' [DllImport(\\\"user32.dll\\\")] public static extern int SendMessageTimeout(int hWnd,int Msg,int wParam,string lParam,int flags,int timeout,out int result); \' ; [Win32.NativeMethods]::SendMessageTimeout(0xffff,0x1A,0,\'Environment\',2,5000,[ref]0)"',
  'openclaw gateway run',
  'openclaw dashboard --no-open'
]

export function assertAllowedCommand(command: string) {
  const allowed = allowedCommands.some(template => command.startsWith(template.split('{')[0]))
  if (!allowed) {
    throw new Error(`Disallowed command: ${command}`)
  }
}
