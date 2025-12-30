// Hybrid Storage Adapter for Zustand
// Automatically switches between local SQLite and remote server based on network mode
// - Standalone/Server mode: uses local SQLite database
// - Client mode: uses server's database via HTTP API

import { createElectronStorage } from './electron-sqlite-storage';
import { createRemoteStorage } from './remote-storage-adapter';
import { isClientMode } from './remote-database';
import { isElectron } from './electron-storage';

// Create a hybrid storage adapter that picks the right backend
export function createHybridStorage<T>(tableName: string) {
  const localStorage = createElectronStorage<T>(tableName);
  const remoteStorage = createRemoteStorage<T>(tableName);
  
  return {
    getItem: async (name: string): Promise<string | null> => {
      // Check if we're in client mode
      if (isElectron() && isClientMode()) {
        console.log(`[HybridStorage] Using remote storage for ${tableName}`);
        return remoteStorage.getItem(name);
      }
      // Use local storage
      console.log(`[HybridStorage] Using local storage for ${tableName}`);
      return localStorage.getItem(name);
    },
    
    setItem: async (name: string, value: string): Promise<void> => {
      // Check if we're in client mode
      if (isElectron() && isClientMode()) {
        console.log(`[HybridStorage] Writing to remote storage for ${tableName}`);
        return remoteStorage.setItem(name, value);
      }
      // Use local storage
      console.log(`[HybridStorage] Writing to local storage for ${tableName}`);
      return localStorage.setItem(name, value);
    },
    
    removeItem: async (name: string): Promise<void> => {
      if (isElectron() && isClientMode()) {
        return remoteStorage.removeItem(name);
      }
      return localStorage.removeItem(name);
    },
  };
}

// Force refresh all stores from server (used when switching to client mode)
export async function refreshFromServer(): Promise<void> {
  if (!isClientMode()) return;
  
  console.log('[HybridStorage] Refreshing all data from server...');
  
  // Reload the page to reinitialize all stores with server data
  window.location.reload();
}
