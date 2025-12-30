// Remote Database Client
// This module provides live access to the server's database when in client mode
// Instead of syncing data locally, all operations go directly to the server

import { isElectron } from './electron-storage';

// Get network config from localStorage (set by network-store)
function getNetworkConfig(): { mode: string; serverIP: string; serverPort: number } | null {
  try {
    const stored = localStorage.getItem('network-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.config || null;
    }
  } catch {
    // Ignore
  }
  return null;
}

// Check if we're in client mode
export function isClientMode(): boolean {
  const config = getNetworkConfig();
  return config?.mode === 'client' && !!config?.serverIP;
}

// Get server connection info
export function getServerConnection(): { ip: string; port: number } | null {
  const config = getNetworkConfig();
  if (config?.mode === 'client' && config.serverIP) {
    return { ip: config.serverIP, port: config.serverPort || 3847 };
  }
  return null;
}

// Remote database operations
export const remoteDb = {
  async getAll(table: string): Promise<any[]> {
    if (!isElectron() || !window.electronAPI?.remoteDb) {
      console.error('Remote DB not available');
      return [];
    }
    
    const conn = getServerConnection();
    if (!conn) {
      console.error('No server connection configured');
      return [];
    }
    
    try {
      const result = await window.electronAPI.remoteDb.getAll(conn.ip, conn.port, table);
      if (result.success) {
        return result.data || [];
      } else {
        console.error(`Remote getAll failed for ${table}:`, result.error);
        return [];
      }
    } catch (error) {
      console.error(`Remote getAll error for ${table}:`, error);
      return [];
    }
  },
  
  async getById(table: string, id: string): Promise<any | null> {
    if (!isElectron() || !window.electronAPI?.remoteDb) {
      return null;
    }
    
    const conn = getServerConnection();
    if (!conn) return null;
    
    try {
      const result = await window.electronAPI.remoteDb.getById(conn.ip, conn.port, table, id);
      if (result.success) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error(`Remote getById error for ${table}/${id}:`, error);
      return null;
    }
  },
  
  async insert(table: string, data: any): Promise<{ success: boolean; error?: string }> {
    if (!isElectron() || !window.electronAPI?.remoteDb) {
      return { success: false, error: 'Remote DB not available' };
    }
    
    const conn = getServerConnection();
    if (!conn) {
      return { success: false, error: 'No server connection' };
    }
    
    try {
      const result = await window.electronAPI.remoteDb.insert(conn.ip, conn.port, table, data);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Insert failed' };
    }
  },
  
  async update(table: string, id: string, data: any): Promise<{ success: boolean; error?: string }> {
    if (!isElectron() || !window.electronAPI?.remoteDb) {
      return { success: false, error: 'Remote DB not available' };
    }
    
    const conn = getServerConnection();
    if (!conn) {
      return { success: false, error: 'No server connection' };
    }
    
    try {
      const result = await window.electronAPI.remoteDb.update(conn.ip, conn.port, table, id, data);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Update failed' };
    }
  },
  
  async delete(table: string, id: string): Promise<{ success: boolean; error?: string }> {
    if (!isElectron() || !window.electronAPI?.remoteDb) {
      return { success: false, error: 'Remote DB not available' };
    }
    
    const conn = getServerConnection();
    if (!conn) {
      return { success: false, error: 'No server connection' };
    }
    
    try {
      const result = await window.electronAPI.remoteDb.delete(conn.ip, conn.port, table, id);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || 'Delete failed' };
    }
  },
};

// Note: Window.electronAPI types are defined in electron-storage.ts
