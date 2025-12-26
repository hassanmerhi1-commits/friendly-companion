const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Storage operations
  storage: {
    read: () => ipcRenderer.invoke('storage:read'),
    write: (data) => ipcRenderer.invoke('storage:write', data),
    getPath: () => ipcRenderer.invoke('storage:getPath'),
  },
  
  // Platform info
  platform: process.platform,
  isElectron: true,
});
