import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('openclaw', {
  startInstall: () => ipcRenderer.invoke('installer:start'),
  retryInstall: () => ipcRenderer.invoke('installer:retry'),
  getLogs: () => ipcRenderer.invoke('installer:getLogs'),
  onLog: (cb: (msg: string) => void) => ipcRenderer.on('installer:log', (_, msg) => cb(msg)),
  onStep: (cb: (step: string) => void) => ipcRenderer.on('installer:step', (_, step) => cb(step)),
  onError: (cb: (payload: { code: string; message: string }) => void) =>
    ipcRenderer.on('installer:error', (_, payload) => cb(payload)),
  onSuccess: (cb: (payload: { dashboardUrl: string }) => void) =>
    ipcRenderer.on('installer:success', (_, payload) => cb(payload))
})
