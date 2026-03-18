import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('openclaw', {
  startInstall: () => ipcRenderer.invoke('installer:start'),
  retryInstall: () => ipcRenderer.invoke('installer:retry'),
  startAuth: () => ipcRenderer.invoke('auth:start'),
  startGateway: () => ipcRenderer.invoke('gateway:start'),
  getLogs: () => ipcRenderer.invoke('installer:getLogs'),
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
  onSuccess: (cb: (payload: { dashboardUrl: string }) => void) =>
    ipcRenderer.on('installer:success', (_, payload) => cb(payload))
})
