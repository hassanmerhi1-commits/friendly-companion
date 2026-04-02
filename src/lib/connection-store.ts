/**
 * Connection Store - Global reactive state for WebSocket connection status
 * Used by the ConnectionStatusBar component
 */
import { create } from 'zustand';

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';

interface ConnectionStore {
  state: ConnectionState;
  retryCount: number;
  serverName: string | null;
  setState: (state: ConnectionState) => void;
  setRetryCount: (count: number) => void;
  setServerName: (name: string | null) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  state: 'offline',
  retryCount: 0,
  serverName: null,
  setState: (state) => set({ state }),
  setRetryCount: (retryCount) => set({ retryCount }),
  setServerName: (serverName) => set({ serverName }),
}));
