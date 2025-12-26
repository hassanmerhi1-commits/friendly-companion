const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Storage operations
  storage: {
    read: () => ipcRenderer.invoke('storage:read'),
    write: (data) => ipcRenderer.invoke('storage:write', data),
    getPath: () => ipcRenderer.invoke('storage:getPath'),
  },
  
  // Network operations for LAN sharing
  network: {
    getConfig: () => ipcRenderer.invoke('network:getConfig'),
    setConfig: (config) => ipcRenderer.invoke('network:setConfig', config),
    getLocalIPs: () => ipcRenderer.invoke('network:getLocalIPs'),
    startServer: (port) => ipcRenderer.invoke('network:startServer', port),
    stopServer: () => ipcRenderer.invoke('network:stopServer'),
    getServerStatus: () => ipcRenderer.invoke('network:getServerStatus'),
    fetchFromServer: (serverIP, port) => ipcRenderer.invoke('network:fetchFromServer', serverIP, port),
    pushToServer: (serverIP, port, data) => ipcRenderer.invoke('network:pushToServer', serverIP, port, data),
    pingServer: (serverIP, port) => ipcRenderer.invoke('network:pingServer', serverIP, port),
  },
  
  // Platform info
  platform: process.platform,
  isElectron: true,
});
