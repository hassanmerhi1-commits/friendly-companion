import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NetworkMode = 'standalone' | 'server' | 'client';

interface NetworkConfig {
  mode: NetworkMode;
  serverIP: string;
  serverPort: number;
}

interface IPAddress {
  name: string;
  address: string;
}

interface ServerStatus {
  running: boolean;
  port: number;
  addresses: IPAddress[];
}

interface NetworkState {
  config: NetworkConfig;
  serverStatus: ServerStatus | null;
  isConnected: boolean;
  lastSyncTime: number | null;
  isSyncing: boolean;
  
  // Actions
  setConfig: (config: NetworkConfig) => Promise<void>;
  refreshServerStatus: () => Promise<void>;
  startServer: (port?: number) => Promise<{ success: boolean; error?: string }>;
  stopServer: () => Promise<void>;
  pullFromServer: () => Promise<{ success: boolean; error?: string }>;
  pushToServer: () => Promise<{ success: boolean; error?: string }>;
  syncWithServer: () => Promise<{ success: boolean; error?: string }>;
  testConnection: (ip: string, port: number) => Promise<{ success: boolean; error?: string }>;
  getLocalIPs: () => Promise<IPAddress[]>;
}

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && 
  (window as any).electronAPI?.isElectron === true;

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      config: {
        mode: 'standalone',
        serverIP: '',
        serverPort: 3847,
      },
      serverStatus: null,
      isConnected: false,
      lastSyncTime: null,
      isSyncing: false,

      setConfig: async (config) => {
        set({ config });
        
        if (isElectron) {
          try {
            await (window as any).electronAPI.network.setConfig(config);
          } catch (error) {
            console.error('Failed to save network config:', error);
          }
        }
      },

      refreshServerStatus: async () => {
        if (!isElectron) return;
        
        try {
          const status = await (window as any).electronAPI.network.getServerStatus();
          set({ serverStatus: status });
        } catch (error) {
          console.error('Failed to get server status:', error);
        }
      },

      startServer: async (port = 3847) => {
        if (!isElectron) {
          return { success: false, error: 'Network features require desktop app' };
        }
        
        try {
          const result = await (window as any).electronAPI.network.startServer(port);
          
          if (result.success) {
            set({ 
              serverStatus: {
                running: true,
                port: result.port,
                addresses: result.addresses || []
              }
            });
            
            // Update config
            const { config } = get();
            await get().setConfig({ ...config, mode: 'server', serverPort: port });
          }
          
          return result;
        } catch (error: any) {
          return { success: false, error: error.message || 'Failed to start server' };
        }
      },

      stopServer: async () => {
        if (!isElectron) return;
        
        try {
          await (window as any).electronAPI.network.stopServer();
          set({ serverStatus: { running: false, port: 3847, addresses: [] } });
          
          // Update config
          const { config } = get();
          await get().setConfig({ ...config, mode: 'standalone' });
        } catch (error) {
          console.error('Failed to stop server:', error);
        }
      },

  // Pull data FROM server (download server data to this machine)
      pullFromServer: async () => {
        if (!isElectron) {
          return { success: false, error: 'Network features require desktop app' };
        }
        
        const { config } = get();
        
        if (!config.serverIP) {
          return { success: false, error: 'Server IP not configured' };
        }
        
        set({ isSyncing: true });
        
        try {
          // Fetch data from server
          const result = await (window as any).electronAPI.network.fetchFromServer(
            config.serverIP,
            config.serverPort
          );
          
          if (result.success && result.data) {
            // Import data directly to SQLite database
            const importResult = await (window as any).electronAPI.db.import(result.data);
            
            if (importResult.success) {
              set({ 
                isConnected: true, 
                lastSyncTime: Date.now(),
                isSyncing: false
              });
              
              // Force page reload to refresh all stores from SQLite
              window.location.reload();
              
              return { success: true };
            }
            
            set({ isSyncing: false });
            return { success: false, error: 'Failed to import data to local database' };
          }
          
          set({ isSyncing: false });
          return { success: false, error: result.error || 'Failed to fetch data from server' };
        } catch (error: any) {
          set({ isSyncing: false, isConnected: false });
          return { success: false, error: error.message || 'Pull failed' };
        }
      },

      // Push data TO server (upload this machine's data to server)
      pushToServer: async () => {
        if (!isElectron) {
          return { success: false, error: 'Network features require desktop app' };
        }
        
        const { config } = get();
        
        if (!config.serverIP) {
          return { success: false, error: 'Server IP not configured' };
        }
        
        set({ isSyncing: true });
        
        try {
          // Export local SQLite data
          const localData = await (window as any).electronAPI.db.export();
          
          if (!localData) {
            set({ isSyncing: false });
            return { success: false, error: 'Failed to export local data' };
          }
          
          // Push to server
          const result = await (window as any).electronAPI.network.pushToServer(
            config.serverIP,
            config.serverPort,
            localData
          );
          
          if (result.success) {
            set({ 
              isConnected: true, 
              lastSyncTime: Date.now(),
              isSyncing: false
            });
            
            return { success: true };
          }
          
          set({ isSyncing: false });
          return { success: false, error: result.error || 'Failed to push data to server' };
        } catch (error: any) {
          set({ isSyncing: false, isConnected: false });
          return { success: false, error: error.message || 'Push failed' };
        }
      },

      // Legacy sync method (alias for pullFromServer for backward compatibility)
      syncWithServer: async () => {
        return get().pullFromServer();
      },

      testConnection: async (ip: string, port: number) => {
        if (!isElectron) {
          return { success: false, error: 'Network features require desktop app' };
        }
        
        try {
          const result = await (window as any).electronAPI.network.pingServer(ip, port);
          return result;
        } catch (error: any) {
          return { success: false, error: error.message || 'Connection failed' };
        }
      },

      getLocalIPs: async () => {
        if (!isElectron) return [];
        
        try {
          return await (window as any).electronAPI.network.getLocalIPs();
        } catch (error) {
          console.error('Failed to get local IPs:', error);
          return [];
        }
      },
    }),
    {
      name: 'network-storage',
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);

// Initialize on load
if (isElectron) {
  setTimeout(async () => {
    const store = useNetworkStore.getState();
    await store.refreshServerStatus();
    
    // Load config from Electron storage
    try {
      const config = await (window as any).electronAPI.network.getConfig();
      if (config && config.mode) {
        useNetworkStore.setState({ config });
      }
    } catch (error) {
      console.error('Failed to load network config:', error);
    }
  }, 100);
}
