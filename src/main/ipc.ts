import { ipcMain } from 'electron'

export function registerIpcHandlers(handlers: {
  startInstall: () => Promise<void>
  retryInstall: () => Promise<void>
  startAuth: () => Promise<void>
  startExternalAuth: () => Promise<{ opened: boolean; url: string | null; error?: string }>
  startGateway: () => Promise<void>
  gatewayStatus: () => Promise<{ ok: boolean; running: boolean }>
  gatewayStop: () => Promise<{ ok: boolean; running: boolean }>
  gatewayRestart: () => Promise<{ ok: boolean; running: boolean }>
  ensureGatewayToken: () => Promise<{ ok: boolean; dashboardUrl?: string; error?: string }>
  startUninstall: () => Promise<{ ok: boolean; logs: string[]; error?: string }>
  startupBootstrap: () => Promise<{
    installed: boolean
    tokenReady?: boolean
    dashboardUrl?: string
    error?: { code: string; message: string }
  }>
  openclawInfo: () => Promise<{ installed: boolean; version: string | null; gatewayRunning: boolean }>
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
  ipcMain.handle('gateway:status', handlers.gatewayStatus)
  ipcMain.handle('gateway:stop', handlers.gatewayStop)
  ipcMain.handle('gateway:restart', handlers.gatewayRestart)
  ipcMain.handle('gateway:ensure-token', handlers.ensureGatewayToken)
  ipcMain.handle('uninstall:run', handlers.startUninstall)
  ipcMain.handle('startup:bootstrap', handlers.startupBootstrap)
  ipcMain.handle('openclaw:info', handlers.openclawInfo)
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
