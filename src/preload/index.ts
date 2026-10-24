import { contextBridge, ipcRenderer } from 'electron';
import { IpcApi } from '../shared/types/ipc';

const api: IpcApi = {
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo'),
    getHealthCheck: () => ipcRenderer.invoke('app:getHealthCheck'),
  },
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', { key, value }),
  },
  db: {
    getStats: () => ipcRenderer.invoke('db:getStats'),
  },
};

// Expose the protected API to the renderer process
contextBridge.exposeInMainWorld('api', api);
