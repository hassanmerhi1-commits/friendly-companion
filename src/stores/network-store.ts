import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NetworkMode = 'standalone' | 'server' | 'client';

interface NetworkConfig {
  mode: NetworkMode;
  serverIP: string;
  serverPort: number;
  autoSyncEnabled: boolean;
  autoSyncInterval: number; // in seconds
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

interface ServerConfigFile {
  exists: boolean;
  serverIP: string;
  serverPort: number;
}

interface NetworkState {
  config: NetworkConfig;
  serverStatus: ServerStatus | null;
  isConnected: boolean;
  lastSyncTime: number | null;
  isSyncing: boolean;
  autoSyncTimerId: number | null;
  serverConfigFile: ServerConfigFile | null;
  serverConfigFilePath: string | null;
  
  // Actions
  setConfig: (config: Partial<NetworkConfig>) => Promise<void>;
  refreshServerStatus: () => Promise<void>;
  startServer: (port?: number) => Promise<{ success: boolean; error?: string }>;
  stopServer: () => Promise<void>;
  pullFromServer: (silent?: boolean) => Promise<{ success: boolean; error?: string }>;
  pushToServer: () => Promise<{ success: boolean; error?: string }>;
  syncWithServer: () => Promise<{ success: boolean; error?: string }>;
  testConnection: (ip: string, port: number) => Promise<{ success: boolean; error?: string }>;
  getLocalIPs: () => Promise<IPAddress[]>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  setAutoSyncEnabled: (enabled: boolean) => Promise<void>;
  setAutoSyncInterval: (seconds: number) => Promise<void>;
  // Dolly-style server config file
  readServerConfigFile: () => Promise<ServerConfigFile>;
  writeServerConfigFile: (ip: string, port: number) => Promise<{ success: boolean; path?: string; error?: string }>;
  deleteServerConfigFile: () => Promise<{ success: boolean; error?: string }>;
  getServerConfigFilePath: () => Promise<string>;
  applyServerConfigFile: () => Promise<{ success: boolean; error?: string }>;
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
        autoSyncEnabled: false,
        autoSyncInterval: 30, // default 30 seconds
      },
      serverStatus: null,
      isConnected: false,
      lastSyncTime: null,
      isSyncing: false,
      autoSyncTimerId: null,
      serverConfigFile: null,
      serverConfigFilePath: null,

      setConfig: async (partialConfig) => {
        const currentConfig = get().config;
        const newConfig = { ...currentConfig, ...partialConfig };
        set({ config: newConfig });
        
        if (isElectron) {
          try {
            await (window as any).electronAPI.network.setConfig(newConfig);
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
            await get().setConfig({ mode: 'server', serverPort: port });
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
          
          // Update config and stop auto-sync
          get().stopAutoSync();
          await get().setConfig({ mode: 'standalone' });
        } catch (error) {
          console.error('Failed to stop server:', error);
        }
      },

      // Pull data FROM server (download server data to this machine)
      pullFromServer: async (silent = false) => {
        if (!isElectron) {
          return { success: false, error: 'Network features require desktop app' };
        }
        
        const { config, isSyncing } = get();
        
        // Skip if already syncing
        if (isSyncing) {
          return { success: false, error: 'Sync already in progress' };
        }
        
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
                isSyncing: false,
              });

              // Only reload if not silent (manual sync)
              if (!silent) {
                window.location.reload();
              }

              return { success: true };
            }

            set({ isSyncing: false, isConnected: false });
            return {
              success: false,
              error: importResult.error || 'Failed to import data to local database',
            };
          }

          set({ isSyncing: false, isConnected: false });
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

      startAutoSync: () => {
        const { config, autoSyncTimerId } = get();
        
        // Clear existing timer
        if (autoSyncTimerId) {
          clearInterval(autoSyncTimerId);
        }
        
        if (config.mode !== 'client' || !config.serverIP || !config.autoSyncEnabled) {
          return;
        }
        
        console.log(`Starting auto-sync every ${config.autoSyncInterval} seconds`);
        
        const timerId = window.setInterval(async () => {
          const { config: currentConfig, isSyncing } = get();
          
          // Only sync if still in client mode with auto-sync enabled
          if (currentConfig.mode === 'client' && currentConfig.autoSyncEnabled && !isSyncing) {
            console.log('Auto-sync: pulling from server...');
            const result = await get().pullFromServer(true); // silent mode
            if (result.success) {
              console.log('Auto-sync: completed successfully');
            } else {
              console.warn('Auto-sync: failed -', result.error);
            }
          }
        }, config.autoSyncInterval * 1000);
        
        set({ autoSyncTimerId: timerId });
      },

      stopAutoSync: () => {
        const { autoSyncTimerId } = get();
        
        if (autoSyncTimerId) {
          clearInterval(autoSyncTimerId);
          set({ autoSyncTimerId: null });
          console.log('Auto-sync stopped');
        }
      },

      setAutoSyncEnabled: async (enabled: boolean) => {
        await get().setConfig({ autoSyncEnabled: enabled });
        
        if (enabled) {
          get().startAutoSync();
        } else {
          get().stopAutoSync();
        }
      },

      setAutoSyncInterval: async (seconds: number) => {
        const minInterval = 10; // minimum 10 seconds
        const validInterval = Math.max(minInterval, seconds);
        
        await get().setConfig({ autoSyncInterval: validInterval });
        
        // Restart auto-sync with new interval if enabled
        const { config } = get();
        if (config.autoSyncEnabled) {
          get().stopAutoSync();
          get().startAutoSync();
        }
      },

      // Dolly-style server config file methods
      readServerConfigFile: async () => {
        if (!isElectron) {
          return { exists: false, serverIP: '', serverPort: 3847 };
        }
        
        try {
          const result = await (window as any).electronAPI.network.readServerConfigFile();
          set({ serverConfigFile: result });
          return result;
        } catch (error) {
          console.error('Failed to read server-config.txt:', error);
          return { exists: false, serverIP: '', serverPort: 3847 };
        }
      },

      writeServerConfigFile: async (ip: string, port: number) => {
        if (!isElectron) {
          return { success: false, error: 'Desktop app required' };
        }
        
        try {
          const result = await (window as any).electronAPI.network.writeServerConfigFile(ip, port);
          if (result.success) {
            set({ serverConfigFilePath: result.path });
          }
          return result;
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      deleteServerConfigFile: async () => {
        if (!isElectron) {
          return { success: false, error: 'Desktop app required' };
        }
        
        try {
          const result = await (window as any).electronAPI.network.deleteServerConfigFile();
          if (result.success) {
            set({ serverConfigFile: null });
          }
          return result;
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },

      getServerConfigFilePath: async () => {
        if (!isElectron) return '';
        
        try {
          const path = await (window as any).electronAPI.network.getServerConfigFilePath();
          set({ serverConfigFilePath: path });
          return path;
        } catch (error) {
          return '';
        }
      },

      // Apply settings from server-config.txt and connect automatically
      applyServerConfigFile: async () => {
        if (!isElectron) {
          return { success: false, error: 'Desktop app required' };
        }
        
        try {
          const configFile = await get().readServerConfigFile();
          
          if (!configFile.exists) {
            return { success: false, error: 'No server-config.txt found' };
          }
          
          // Set client mode with the IP from the file
          await get().setConfig({
            mode: 'client',
            serverIP: configFile.serverIP,
            serverPort: configFile.serverPort
          });
          
          // Test connection
          const pingResult = await get().testConnection(configFile.serverIP, configFile.serverPort);
          
          if (pingResult.success) {
            console.log('Connected to server from server-config.txt:', configFile.serverIP);
            return { success: true };
          }
          
          return { success: false, error: 'Server not reachable' };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      },
    }),
    {
      name: 'network-storage',
      partialize: (state) => ({
        config: state.config,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<NetworkState> | undefined;
        return {
          ...currentState,
          ...persisted,
          config: {
            ...currentState.config,
            ...(persisted?.config ?? {}),
          },
        } as NetworkState;
      },
    }
  )
);

// Initialize on load
if (isElectron) {
  setTimeout(async () => {
    const store = useNetworkStore.getState();

    // 1) Load saved config FIRST
    let savedConfig: any = null;
    try {
      savedConfig = await (window as any).electronAPI.network.getConfig();
      if (savedConfig && savedConfig.mode) {
        useNetworkStore.setState({
          config: {
            ...useNetworkStore.getState().config,
            ...savedConfig,
          },
        });
      }
    } catch (error) {
      console.error('Failed to load network config:', error);
    }

    // 2) Refresh server status
    await store.refreshServerStatus();

    // 3) If server-config.txt exists, apply it (but never override a server machine)
    try {
      const configFile = await store.readServerConfigFile();
      await store.getServerConfigFilePath();

      const current = useNetworkStore.getState().config;
      if (configFile.exists && current.mode !== 'server') {
        await store.setConfig({
          mode: 'client',
          serverIP: configFile.serverIP,
          serverPort: configFile.serverPort,
        });
        console.log('Auto-configured as client from server-config.txt');
      }
    } catch (error) {
      console.error('Failed to check server-config.txt:', error);
    }

    // 4) Start auto-sync if enabled
    const cfg = useNetworkStore.getState().config;
    if (cfg.mode === 'client' && cfg.autoSyncEnabled) {
      store.startAutoSync();
    }
  }, 100);
}
