import { ipcMain } from 'electron'

export function registerIpcHandlers(handlers: {
  startInstall: () => Promise<void>
  retryInstall: () => Promise<void>
  startAuth: () => Promise<void>
  startGateway: () => Promise<void>
  getLogs: () => string[]
}) {
  ipcMain.handle('installer:start', handlers.startInstall)
  ipcMain.handle('installer:retry', handlers.retryInstall)
  ipcMain.handle('auth:start', handlers.startAuth)
  ipcMain.handle('gateway:start', handlers.startGateway)
  ipcMain.handle('installer:getLogs', handlers.getLogs)
}
