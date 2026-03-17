import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { BrowserWindow } from 'electron'
import { assertAllowedCommand } from './install/commandAllowlist'

const execAsync = promisify(exec)
const logs: string[] = []

export function emitLog(win: BrowserWindow, message: string) {
  logs.push(message)
  win.webContents.send('installer:log', message)
}

export function emitStep(win: BrowserWindow, step: string) {
  win.webContents.send('installer:step', step)
}

export function emitError(win: BrowserWindow, code: string, message: string) {
  win.webContents.send('installer:error', { code, message })
}

export function getLogs() {
  return [...logs]
}

export async function execCommand(command: string, win?: BrowserWindow) {
  assertAllowedCommand(command)
  try {
    const { stdout, stderr } = await execAsync(command)
    if (win && stdout) emitLog(win, stdout)
    if (win && stderr) emitLog(win, stderr)
    return { stdout, stderr, code: 0 }
  } catch (error: any) {
    const stdout = error?.stdout ?? ''
    const stderr = error?.stderr ?? String(error)
    if (win && stdout) emitLog(win, stdout)
    if (win && stderr) emitLog(win, stderr)
    const code = typeof error?.code === 'number' ? error.code : 1
    return { stdout, stderr, code }
  }
}
