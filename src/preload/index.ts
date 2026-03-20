import { contextBridge, ipcRenderer } from 'electron'

if (process.env.NODE_ENV !== 'production') {
  console.log('[preload] loaded', { contextIsolation: process.contextIsolated })
}

contextBridge.exposeInMainWorld('openclaw', {
  startupBootstrap: () => ipcRenderer.invoke('startup:bootstrap'),
  startInstall: () => ipcRenderer.invoke('installer:start'),
  retryInstall: () => ipcRenderer.invoke('installer:retry'),
  startAuth: () => ipcRenderer.invoke('auth:start'),
  startExternalAuth: () => ipcRenderer.invoke('auth:external'),
  startGateway: () => ipcRenderer.invoke('gateway:start'),
  uninstall: () => ipcRenderer.invoke('uninstall:run'),
  getLogs: () => ipcRenderer.invoke('installer:getLogs'),
  getModelConfig: () => ipcRenderer.invoke('model-config:get'),
  saveModelConfig: (payload: {
    providerId: string
    apiKey: string
    baseUrl: string
    defaultModel: string
  }) => ipcRenderer.invoke('model-config:save', payload),
  startQwenAuth: () => ipcRenderer.invoke('model-config:qwen-auth'),
  onLog: (cb: (msg: string) => void) => ipcRenderer.on('installer:log', (_, msg) => cb(msg)),
  onStep: (cb: (step: string) => void) => ipcRenderer.on('installer:step', (_, step) => cb(step)),
  onError: (cb: (payload: { code: string; message: string }) => void) =>
    ipcRenderer.on('installer:error', (_, payload) => cb(payload)),
  onInstallDone: (cb: () => void) => ipcRenderer.on('installer:done', () => cb()),
  onAuthProgress: (
    cb: (payload: { url: string | null; userCode: string | null; message: string }) => void
  ) => ipcRenderer.on('auth:progress', (_, payload) => cb(payload)),
  onAuthDone: (cb: () => void) => ipcRenderer.on('auth:done', () => cb()),
  onAuthError: (cb: (payload: { code: string; message: string }) => void) =>
    ipcRenderer.on('auth:error', (_, payload) => cb(payload)),
  onGatewayReady: (cb: (payload: { dashboardUrl: string }) => void) =>
    ipcRenderer.on('gateway:ready', (_, payload) => cb(payload)),
  onUninstallLog: (cb: (msg: string) => void) => ipcRenderer.on('uninstall:log', (_, msg) => cb(msg)),
  onSuccess: (cb: (payload: { dashboardUrl: string }) => void) =>
    ipcRenderer.on('installer:success', (_, payload) => cb(payload))
})
