/**
 * Electron Storage - Dolly Style
 * 
 * Simple: Just check if we're in Electron. That's it.
 * The database path comes from the IP file, handled by main.cjs.
 * No automatic syncing, no file creation, no complexity.
 */

// Type definitions for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI?: {
      db: {
        getStatus: () => Promise<any>;
        create: () => Promise<any>;
        init: () => Promise<any>;
        getAll: (table: string) => Promise<any[]>;
        getById: (table: string, id: string) => Promise<any>;
        insert: (table: string, data: any) => Promise<any>;
        update: (table: string, id: string, data: any) => Promise<any>;
        delete: (table: string, id: string) => Promise<any>;
        query: (sql: string, params?: any[]) => Promise<any>;
        export: () => Promise<any>;
        import: (data: any) => Promise<any>;
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
  console.log('[Electron] Ready - database path from IP file');
}
