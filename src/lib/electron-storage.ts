/**
 * Electron Storage - Multi-Company Support
 * 
 * Checks if we're in Electron and provides type definitions
 * for the IPC bridge including company management APIs.
 */

// Type definitions for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI?: {
      db: {
        getStatus: () => Promise<any>;
        create: () => Promise<any>;
        init: () => Promise<any>;
        getAll: (table: string, companyId?: string) => Promise<any[]>;
        getById: (table: string, id: string, companyId?: string) => Promise<any>;
        insert: (table: string, data: any, companyId?: string) => Promise<any>;
        update: (table: string, id: string, data: any, companyId?: string) => Promise<any>;
        delete: (table: string, id: string, companyId?: string) => Promise<any>;
        query: (sql: string, params?: any[], companyId?: string) => Promise<any>;
        export: (companyId?: string) => Promise<any>;
        import: (data: any, companyId?: string) => Promise<any>;
        testConnection: () => Promise<any>;
      };
      company: {
        list: () => Promise<Array<{ id: string; name: string; dbFile: string }>>;
        create: (name: string) => Promise<{ success: boolean; company?: { id: string; name: string; dbFile: string }; error?: string }>;
        setActive: (companyId: string) => Promise<{ success: boolean; error?: string }>;
      };
      ipfile: {
        read: () => Promise<string | null>;
        write: (content: string) => Promise<boolean>;
        parse: () => Promise<{ isClient: boolean; serverIP: string | null; dbPath: string }>;
      };
      activation: {
        check: () => Promise<boolean>;
        activate: () => Promise<boolean>;
      };
      network: {
        getLocalIPs: () => Promise<string[]>;
        startServer: (port: number) => Promise<any>;
        stopServer: () => Promise<any>;
        getServerStatus: () => Promise<any>;
        pingServer: (serverIP: string, port: number) => Promise<any>;
        getInstallPath: () => Promise<string>;
        getIPFilePath: () => Promise<string>;
      };
      app: {
        relaunch: () => Promise<void>;
      };
      platform: string;
      isElectron: boolean;
    };
  }
}

// Check if running in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

// Initialize - just log, no automatic actions
export async function initElectronStorage(): Promise<void> {
  if (!isElectron()) {
    console.log('[App] Running in browser mode');
    return;
  }
  console.log('[Electron] Ready - multi-company database support');
}
