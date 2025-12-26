/**
 * Electron Storage Adapter
 * 
 * Syncs localStorage data with a local file when running in Electron.
 * This ensures data persists independently of the browser.
 */

// Type definitions for Electron API exposed via preload
declare global {
  interface Window {
    electronAPI?: {
      storage: {
        read: () => Promise<Record<string, unknown> | null>;
        write: (data: Record<string, unknown>) => Promise<boolean>;
        getPath: () => Promise<string>;
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
];

// Check if running in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

// Load data from Electron file storage to localStorage
export async function loadFromElectronStorage(): Promise<void> {
  if (!isElectron()) return;

  try {
    const data = await window.electronAPI!.storage.read();
    
    if (data) {
      // Write each key to localStorage
      for (const key of STORAGE_KEYS) {
        if (data[key]) {
          localStorage.setItem(key, JSON.stringify(data[key]));
        }
      }
      console.log('[Electron] Loaded data from file storage');
    }
  } catch (error) {
    console.error('[Electron] Error loading from file storage:', error);
  }
}

// Save current localStorage data to Electron file storage
export async function saveToElectronStorage(): Promise<boolean> {
  if (!isElectron()) return false;

  try {
    const data: Record<string, unknown> = {};
    
    // Collect all storage keys
    for (const key of STORAGE_KEYS) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    }

    const success = await window.electronAPI!.storage.write(data);
    if (success) {
      console.log('[Electron] Saved data to file storage');
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
  return window.electronAPI!.storage.getPath();
}

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
