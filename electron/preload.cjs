const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
// Architecture: Pure file-based LAN access via UNC paths (like Minerva ERP)
// Server: C:\PayrollAO\payroll.db (local path)
// Client: \\10.0.0.10\PayrollAO\payroll.db (UNC path to shared folder)
contextBridge.exposeInMainWorld('electronAPI', {
  // Activation operations
  activation: {
    check: () => ipcRenderer.invoke('activation:check'),
    activate: () => ipcRenderer.invoke('activation:activate'),
  },
  
  // IP file operations
  ipfile: {
    read: () => ipcRenderer.invoke('ipfile:read'),
    write: (content) => ipcRenderer.invoke('ipfile:write', content),
    parse: () => ipcRenderer.invoke('ipfile:parse'),
  },
  
  // Database operations (direct SQLite access via local or UNC path)
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
    testConnection: () => ipcRenderer.invoke('db:testConnection'),
  },
  
  // Network info (display only)
  network: {
    getLocalIPs: () => ipcRenderer.invoke('network:getLocalIPs'),
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
