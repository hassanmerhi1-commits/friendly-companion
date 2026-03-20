/**
 * PayrollAO - Preload Script
 * 
 * Exposes IPC methods to renderer process via contextBridge.
 * All database operations are routed through main process which handles
 * server/client mode transparently. Supports multi-company via companyId.
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
  
  // Company management
  company: {
    list: () => ipcRenderer.invoke('company:list'),
    create: (name) => ipcRenderer.invoke('company:create', name),
    setActive: (companyId) => ipcRenderer.invoke('company:setActive', companyId),
  },
  
  // Database operations (transparently routed to server if client mode)
  // All operations accept optional companyId as last parameter
  db: {
    getStatus: () => ipcRenderer.invoke('db:getStatus'),
    create: () => ipcRenderer.invoke('db:create'),
    init: () => ipcRenderer.invoke('db:init'),
    getAll: (table, companyId) => ipcRenderer.invoke('db:getAll', table, companyId),
    getById: (table, id, companyId) => ipcRenderer.invoke('db:getById', table, id, companyId),
    insert: (table, data, companyId) => ipcRenderer.invoke('db:insert', table, data, companyId),
    update: (table, id, data, companyId) => ipcRenderer.invoke('db:update', table, id, data, companyId),
    delete: (table, id, companyId) => ipcRenderer.invoke('db:delete', table, id, companyId),
    query: (sql, params, companyId) => ipcRenderer.invoke('db:query', sql, params, companyId),
    export: (companyId) => ipcRenderer.invoke('db:export', companyId),
    import: (data, companyId) => ipcRenderer.invoke('db:import', data, companyId),
    testConnection: () => ipcRenderer.invoke('db:testConnection'),
  },
  
  // Real-time update listener (server broadcasts to all clients)
  onDatabaseUpdate: (callback) => {
    ipcRenderer.removeAllListeners('payroll:updated');
    ipcRenderer.on('payroll:updated', (_, data) => callback(data));
  },
  
  // TRUE PUSH: Receive full table data from server (no refetch needed)
  onDatabaseSync: (callback) => {
    ipcRenderer.removeAllListeners('payroll:sync');
    ipcRenderer.on('payroll:sync', (_, data) => callback(data));
  },
  
  // Network info
  network: {
    getLocalIPs: () => ipcRenderer.invoke('network:getLocalIPs'),
    getInstallPath: () => ipcRenderer.invoke('network:getInstallPath'),
    getIPFilePath: () => ipcRenderer.invoke('network:getIPFilePath'),
    getComputerName: () => ipcRenderer.invoke('network:getComputerName'),
  },

  // Printing (Electron-only)
  print: {
    html: (html, options) => ipcRenderer.invoke('print:html', html, options),
  },

  // App controls
  app: {
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
  },

  // Auto-updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    getVersion: () => ipcRenderer.invoke('updater:getVersion'),
    onStatus: (callback) => {
      ipcRenderer.removeAllListeners('updater:status');
      ipcRenderer.on('updater:status', (_, data) => callback(data));
    },
  },
  
  // Platform info
  platform: process.platform,
  isElectron: true,
});
