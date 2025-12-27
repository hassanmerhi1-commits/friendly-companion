/**
 * Electron Storage Adapter
 * 
 * Syncs localStorage data with a local file when running in Electron.
 * This ensures data persists independently of the browser.
 * Each province has its own separate data file.
 */

import { getProvinceStoragePrefix, isProvinceSelected } from './province-storage';

// Type definitions for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI?: {
      db: {
        getAll: (table: string) => Promise<any[]>;
        getById: (table: string, id: string) => Promise<any>;
        insert: (table: string, data: any) => Promise<any>;
        update: (table: string, id: string, data: any) => Promise<any>;
        delete: (table: string, id: string) => Promise<any>;
        query: (sql: string, params?: any[]) => Promise<any>;
        export: () => Promise<any>;
        import: (data: any) => Promise<any>;
      };
      storage: {
        read: (fileName?: string) => Promise<Record<string, unknown> | null>;
        write: (data: Record<string, unknown>, fileName?: string) => Promise<boolean>;
        getPath: (fileName?: string) => Promise<string>;
      };
      network: {
        getConfig: () => Promise<any>;
        setConfig: (config: any) => Promise<any>;
        getLocalIPs: () => Promise<string[]>;
        startServer: (port: number) => Promise<any>;
        stopServer: () => Promise<any>;
        getServerStatus: () => Promise<any>;
        fetchFromServer: (serverIP: string, port: number) => Promise<any>;
        pushToServer: (serverIP: string, port: number, data: any) => Promise<any>;
        pingServer: (serverIP: string, port: number) => Promise<any>;
      };
      platform: string;
      isElectron: boolean;
    };
  }
}

// Storage keys used by the app
const STORAGE_KEYS = [
  'payrollao-employees',
  'payrollao-branches',
  'payrollao-payroll',
  'payrollao-deductions',
  'payrollao-holidays',
  'payrollao-settings',
  'payrollao-absences',
];

// Get province-specific storage key
function getProvinceKey(baseKey: string): string {
  const prefix = getProvinceStoragePrefix();
  return `${baseKey}-${prefix}`;
}

// Get the data file name for the current province
function getProvinceDataFileName(): string {
  const prefix = getProvinceStoragePrefix();
  return `payroll-data-${prefix}.json`;
}

// Check if running in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

// Load data from Electron file storage to localStorage
export async function loadFromElectronStorage(): Promise<void> {
  if (!isElectron()) return;
  if (!isProvinceSelected()) return;

  try {
    const fileName = getProvinceDataFileName();
    const data = await window.electronAPI!.storage.read(fileName);
    
    if (data) {
      // Write each key to localStorage with province prefix
      for (const key of STORAGE_KEYS) {
        const provinceKey = getProvinceKey(key);
        if (data[key]) {
          localStorage.setItem(provinceKey, JSON.stringify(data[key]));
        }
      }
      console.log(`[Electron] Loaded data from ${fileName}`);
    }
  } catch (error) {
    console.error('[Electron] Error loading from file storage:', error);
  }
}

// Save current localStorage data to Electron file storage
export async function saveToElectronStorage(): Promise<boolean> {
  if (!isElectron()) return false;
  if (!isProvinceSelected()) return false;

  try {
    const data: Record<string, unknown> = {};
    const fileName = getProvinceDataFileName();
    
    // Collect all storage keys with province prefix
    for (const key of STORAGE_KEYS) {
      const provinceKey = getProvinceKey(key);
      const value = localStorage.getItem(provinceKey);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    }

    const success = await window.electronAPI!.storage.write(data, fileName);
    if (success) {
      console.log(`[Electron] Saved data to ${fileName}`);
    }
    return success;
  } catch (error) {
    console.error('[Electron] Error saving to file storage:', error);
    return false;
  }
}

// Get the path where data is stored
export async function getStoragePath(): Promise<string | null> {
  if (!isElectron()) return null;
  const fileName = getProvinceDataFileName();
  return window.electronAPI!.storage.getPath(fileName);
}

// Re-export for use in stores
export { getProvinceKey };

// Debounce function to prevent too many writes
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Debounced save function (saves at most once per second)
const debouncedSave = debounce(saveToElectronStorage, 1000);

// Set up automatic storage sync
export function setupElectronStorageSync(): void {
  if (!isElectron()) return;

  // Listen for storage changes and sync to file
  window.addEventListener('storage', () => {
    debouncedSave();
  });

  // Also intercept localStorage.setItem to catch changes from the same window
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    originalSetItem(key, value);
    if (STORAGE_KEYS.includes(key)) {
      debouncedSave();
    }
  };

  // Save on page unload
  window.addEventListener('beforeunload', () => {
    // Synchronous save attempt
    if (isElectron()) {
      saveToElectronStorage();
    }
  });

  console.log('[Electron] Storage sync enabled');
}

// Initialize Electron storage (call this on app start)
export async function initElectronStorage(): Promise<void> {
  if (!isElectron()) {
    console.log('[App] Running in browser mode');
    return;
  }

  console.log('[Electron] Initializing file-based storage...');
  
  // Load existing data from file
  await loadFromElectronStorage();
  
  // Set up automatic sync
  setupElectronStorageSync();
  
  const storagePath = await getStoragePath();
  console.log('[Electron] Data file location:', storagePath);
}
