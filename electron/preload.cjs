/**
 * PayrollAO - Simplified Preload Script
 * 
 * Exposes IPC methods to renderer process via contextBridge.
 * All database operations are routed through main process which handles
 * server/client mode transparently.
 */

const { contextBridge, ipcRenderer } = require('electron');

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
  
  // Database operations (transparently routed to server if client mode)
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
  
  // Real-time update listener (server broadcasts to all clients)
  onDatabaseUpdate: (callback) => {
    ipcRenderer.removeAllListeners('payroll:updated');
    ipcRenderer.on('payroll:updated', (_, data) => callback(data));
  },
  
  // Network info
  network: {
    getLocalIPs: () => ipcRenderer.invoke('network:getLocalIPs'),
    getInstallPath: () => ipcRenderer.invoke('network:getInstallPath'),
    getIPFilePath: () => ipcRenderer.invoke('network:getIPFilePath'),
    getComputerName: () => ipcRenderer.invoke('network:getComputerName'),
  },

  // App controls
  app: {
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
  },
  
  // Platform info
  platform: process.platform,
  isElectron: true,
});
