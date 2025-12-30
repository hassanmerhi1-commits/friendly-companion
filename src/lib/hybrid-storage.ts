// Hybrid Storage Adapter for Zustand
// Automatically switches between local SQLite and remote server based on network mode
// - Standalone/Server mode: uses local SQLite database
// - Client mode: uses server's database via HTTP API (live central database)

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
      // Check if we're in client mode - must check on every call (not cached)
      const clientMode = isElectron() && isClientMode();
      
      if (clientMode) {
        console.log(`[HybridStorage] Client mode: fetching ${tableName} from server`);
        try {
          const result = await remoteStorage.getItem(name);
          if (result) {
            console.log(`[HybridStorage] Got ${tableName} data from server`);
            return result;
          }
          console.log(`[HybridStorage] No ${tableName} data from server, using empty state`);
          return null;
        } catch (error) {
          console.error(`[HybridStorage] Error fetching ${tableName} from server:`, error);
          // Fall back to local storage if server fails
          return localStorage.getItem(name);
        }
      }
      
      // Use local storage (standalone or server mode)
      console.log(`[HybridStorage] Local mode: reading ${tableName} from SQLite`);
      return localStorage.getItem(name);
    },
    
    setItem: async (name: string, value: string): Promise<void> => {
      // Check if we're in client mode - must check on every call
      const clientMode = isElectron() && isClientMode();
      
      if (clientMode) {
        console.log(`[HybridStorage] Client mode: writing ${tableName} to server`);
        try {
          await remoteStorage.setItem(name, value);
          return;
        } catch (error) {
          console.error(`[HybridStorage] Error writing ${tableName} to server:`, error);
          // Don't fall back to local - we want data consistency
          throw error;
        }
      }
      
      // Use local storage (standalone or server mode)
      console.log(`[HybridStorage] Local mode: writing ${tableName} to SQLite`);
      return localStorage.setItem(name, value);
    },
    
    removeItem: async (name: string): Promise<void> => {
      const clientMode = isElectron() && isClientMode();
      
      if (clientMode) {
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
