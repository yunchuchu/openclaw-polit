import { ipcMain } from 'electron'

export function registerIpcHandlers(handlers: {
  startInstall: () => Promise<void>
  retryInstall: () => Promise<void>
  startAuth: () => Promise<void>
  startExternalAuth: () => Promise<{ opened: boolean; url: string | null; error?: string }>
  startGateway: () => Promise<void>
  startUninstall: () => Promise<{ ok: boolean; logs: string[]; error?: string }>
  startupBootstrap: () => Promise<{
    installed: boolean
    dashboardUrl?: string
    error?: { code: string; message: string }
  }>
  getLogs: () => string[]
}) {
  ipcMain.handle('installer:start', handlers.startInstall)
  ipcMain.handle('installer:retry', handlers.retryInstall)
  ipcMain.handle('auth:start', handlers.startAuth)
  ipcMain.handle('auth:external', handlers.startExternalAuth)
  ipcMain.handle('gateway:start', handlers.startGateway)
  ipcMain.handle('uninstall:run', handlers.startUninstall)
  ipcMain.handle('startup:bootstrap', handlers.startupBootstrap)
  ipcMain.handle('installer:getLogs', handlers.getLogs)
}
