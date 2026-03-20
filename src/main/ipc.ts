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
  getModelConfig: () => Promise<{ ok: boolean; data?: ModelConfigPayload; error?: string }>
  saveModelConfig: (payload: ModelConfigPayload) => Promise<{ ok: boolean; error?: string }>
  startQwenAuth: () => Promise<{ opened: boolean; url: string | null; error?: string }>
}) {
  ipcMain.handle('installer:start', handlers.startInstall)
  ipcMain.handle('installer:retry', handlers.retryInstall)
  ipcMain.handle('auth:start', handlers.startAuth)
  ipcMain.handle('auth:external', handlers.startExternalAuth)
  ipcMain.handle('gateway:start', handlers.startGateway)
  ipcMain.handle('uninstall:run', handlers.startUninstall)
  ipcMain.handle('startup:bootstrap', handlers.startupBootstrap)
  ipcMain.handle('installer:getLogs', handlers.getLogs)
  ipcMain.handle('model-config:get', handlers.getModelConfig)
  ipcMain.handle('model-config:save', (_event, payload: ModelConfigPayload) =>
    handlers.saveModelConfig(payload)
  )
  ipcMain.handle('model-config:qwen-auth', handlers.startQwenAuth)
}

type ModelConfigPayload = {
  providerId: string
  apiKey: string
  baseUrl: string
  defaultModel: string
}
