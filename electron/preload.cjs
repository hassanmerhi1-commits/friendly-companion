const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations (SQLite - local)
  db: {
    getAll: (table) => ipcRenderer.invoke('db:getAll', table),
    getById: (table, id) => ipcRenderer.invoke('db:getById', table, id),
    insert: (table, data) => ipcRenderer.invoke('db:insert', table, data),
    update: (table, id, data) => ipcRenderer.invoke('db:update', table, id, data),
    delete: (table, id) => ipcRenderer.invoke('db:delete', table, id),
    query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
    export: () => ipcRenderer.invoke('db:export'),
    import: (data) => ipcRenderer.invoke('db:import', data),
  },
  
  // Remote database operations (for client mode - calls server API directly)
  remoteDb: {
    getAll: (serverIP, port, table) => ipcRenderer.invoke('remoteDb:getAll', serverIP, port, table),
    getById: (serverIP, port, table, id) => ipcRenderer.invoke('remoteDb:getById', serverIP, port, table, id),
    insert: (serverIP, port, table, data) => ipcRenderer.invoke('remoteDb:insert', serverIP, port, table, data),
    update: (serverIP, port, table, id, data) => ipcRenderer.invoke('remoteDb:update', serverIP, port, table, id, data),
    delete: (serverIP, port, table, id) => ipcRenderer.invoke('remoteDb:delete', serverIP, port, table, id),
  },
  
  // Legacy storage operations (backward compatibility)
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
    // Dolly-style server config file
    readServerConfigFile: () => ipcRenderer.invoke('network:readServerConfigFile'),
    writeServerConfigFile: (ip, pathOrPort) => ipcRenderer.invoke('network:writeServerConfigFile', ip, pathOrPort),
    deleteServerConfigFile: () => ipcRenderer.invoke('network:deleteServerConfigFile'),
    getServerConfigFilePath: () => ipcRenderer.invoke('network:getServerConfigFilePath'),
    getLocalDataPath: () => ipcRenderer.invoke('network:getLocalDataPath'),
  },
  
  // Platform info
  platform: process.platform,
  isElectron: true,
});