// Client Connection Manager
// Manages connection state for client mode and blocks edits when offline

import { create } from 'zustand';
import { isElectron } from './electron-storage';
import { isClientMode, getServerConnection } from './remote-database';

interface ConnectionState {
  isOnline: boolean;
  lastPingTime: number | null;
  lastError: string | null;
  isChecking: boolean;
  
  // Actions
  checkConnection: () => Promise<boolean>;
  setOnline: (online: boolean) => void;
  startConnectionMonitor: () => void;
  stopConnectionMonitor: () => void;
}

let monitorInterval: number | null = null;

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  isOnline: true, // Assume online initially
  lastPingTime: null,
  lastError: null,
  isChecking: false,
  
  checkConnection: async () => {
    if (!isElectron() || !isClientMode()) {
      set({ isOnline: true });
      return true;
    }
    
    const conn = getServerConnection();
    if (!conn) {
      set({ isOnline: false, lastError: 'No server configured' });
      return false;
    }
    
    set({ isChecking: true });
    
    try {
      const result = await (window as any).electronAPI.network.pingServer(conn.ip, conn.port);
      const online = result?.success === true;
      set({ 
        isOnline: online, 
        lastPingTime: Date.now(),
        lastError: online ? null : (result?.error || 'Connection failed'),
        isChecking: false
      });
      return online;
    } catch (error: any) {
      set({ 
        isOnline: false, 
        lastError: error.message || 'Connection error',
        isChecking: false
      });
      return false;
    }
  },
  
  setOnline: (online: boolean) => {
    set({ isOnline: online });
  },
  
  startConnectionMonitor: () => {
    if (monitorInterval) return;
    
    // Check connection every 10 seconds when in client mode
    monitorInterval = window.setInterval(() => {
      if (isClientMode()) {
        get().checkConnection();
      }
    }, 10000);
    
    // Initial check
    if (isClientMode()) {
      get().checkConnection();
    }
  },
  
  stopConnectionMonitor: () => {
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
  },
}));

// Helper to check if we can write (online or not in client mode)
export function canWrite(): boolean {
  if (!isClientMode()) return true;
  return useConnectionStore.getState().isOnline;
}

// Helper to get connection error message
export function getConnectionError(): string | null {
  if (!isClientMode()) return null;
  if (useConnectionStore.getState().isOnline) return null;
  return useConnectionStore.getState().lastError || 'Servidor não acessível / Server not reachable';
}

// Initialize connection monitor on app start
if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (isElectron() && isClientMode()) {
      useConnectionStore.getState().startConnectionMonitor();
    }
  }, 1000);
}
