const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Activation operations (one-time on first install)
  activation: {
    check: () => ipcRenderer.invoke('activation:check'),
    activate: () => ipcRenderer.invoke('activation:activate'),
  },
  
  // IP file operations (Dolly-style config)
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
  
  // Legacy storage operations (backward compatibility)
  storage: {
    read: () => ipcRenderer.invoke('storage:read'),
    write: (data) => ipcRenderer.invoke('storage:write', data),
    getPath: () => ipcRenderer.invoke('storage:getPath'),
  },
  
  // Network operations
  network: {
    getLocalIPs: () => ipcRenderer.invoke('network:getLocalIPs'),
    startServer: (port) => ipcRenderer.invoke('network:startServer', port),
    stopServer: () => ipcRenderer.invoke('network:stopServer'),
    getServerStatus: () => ipcRenderer.invoke('network:getServerStatus'),

    // Server-config (LAN client mode)
    pingServer: (serverIP, port) => ipcRenderer.invoke('network:pingServer', serverIP, port),
    readServerConfigFile: () => ipcRenderer.invoke('network:readServerConfigFile'),
    writeServerConfigFile: (ip, port) => ipcRenderer.invoke('network:writeServerConfigFile', ip, port),
    deleteServerConfigFile: () => ipcRenderer.invoke('network:deleteServerConfigFile'),
    getServerConfigFilePath: () => ipcRenderer.invoke('network:getServerConfigFilePath'),

    // DB path info
    getLocalDataPath: () => ipcRenderer.invoke('network:getLocalDataPath'),

    // Paths
    getInstallPath: () => ipcRenderer.invoke('network:getInstallPath'),
    getIPFilePath: () => ipcRenderer.invoke('network:getIPFilePath'),
  },

  app: {
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
  },
  
  // Platform info
  platform: process.platform,
  isElectron: true,
});
