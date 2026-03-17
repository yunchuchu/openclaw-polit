import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('openclaw', {})
