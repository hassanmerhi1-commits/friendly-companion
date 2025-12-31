const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
// Dolly-style: IP file determines everything
contextBridge.exposeInMainWorld('electronAPI', {
  // Activation operations (one-time on first install)
  activation: {
    check: () => ipcRenderer.invoke('activation:check'),
    activate: () => ipcRenderer.invoke('activation:activate'),
  },
  
  // IP file operations (Dolly-style config)
  // Format: "C:\path\db.db" (server) or "10.0.0.10:C:\path\db.db" (client)
  ipfile: {
    read: () => ipcRenderer.invoke('ipfile:read'),
    write: (content) => ipcRenderer.invoke('ipfile:write', content),
    parse: () => ipcRenderer.invoke('ipfile:parse'),
  },
  
  // Database operations
  db: {
    getStatus: () => ipcRenderer.invoke('db:getStatus'),
    create: () => ipcRenderer.invoke('db:create'),
    init: () => ipcRenderer.invoke('db:init'),
    getAll: (table) => ipcRenderer.invoke('db:getAll', table),
    getById: (table, id) => ipcRenderer.invoke('db:getById', table, id),
    insert: (table, data) => ipcRenderer.invoke('db:insert', table, data),
    update: (table, id, data) => ipcRenderer.invoke('db:update', table, id, data),
    delete: (table, id) => ipcRenderer.invoke('db:delete', table, id),
    query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
    export: () => ipcRenderer.invoke('db:export'),
    import: (data) => ipcRenderer.invoke('db:import', data),
  },
  
  // Network operations (HTTP server for LAN sharing)
  network: {
    getLocalIPs: () => ipcRenderer.invoke('network:getLocalIPs'),
    startServer: (port) => ipcRenderer.invoke('network:startServer', port),
    stopServer: () => ipcRenderer.invoke('network:stopServer'),
    getServerStatus: () => ipcRenderer.invoke('network:getServerStatus'),
    pingServer: (serverIP, port) => ipcRenderer.invoke('network:pingServer', serverIP, port),
    getInstallPath: () => ipcRenderer.invoke('network:getInstallPath'),
    getIPFilePath: () => ipcRenderer.invoke('network:getIPFilePath'),
  },

  // App controls
  app: {
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
  },
  
  // Platform info
  platform: process.platform,
  isElectron: true,
});
