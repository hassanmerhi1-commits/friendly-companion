// Electron SQLite Storage Utility
// This provides a custom Zustand storage that uses SQLite when running in Electron
// Each province has its own separate data storage

// Import type from electron-storage (types are defined there)
import { isElectron } from './electron-storage';
import { getProvinceStoragePrefix, isProvinceSelected } from './province-storage';

// Get province-specific storage name
function getProvinceStorageKey(baseName: string): string {
  const prefix = getProvinceStoragePrefix();
  return `${baseName}-${prefix}`;
}

// Create a Zustand storage adapter that uses SQLite in Electron
export function createElectronStorage<T>(tableName: string) {
  return {
    getItem: async (name: string): Promise<string | null> => {
      // Use province-specific storage key
      const storageKey = getProvinceStorageKey(name);

      // Prefer localStorage first (it is always written as the source of truth)
      const localValue = localStorage.getItem(storageKey);
      if (localValue) return localValue;

      // Fallback to SQLite (when available) for recovery
      if (isElectron() && isProvinceSelected() && window.electronAPI?.db) {
        try {
          const rows = await window.electronAPI.db.getAll(tableName);
          if (rows && rows.length > 0) {
            // Convert SQLite rows back to the state format
            const state = convertRowsToState(tableName, rows);
            return JSON.stringify({ state, version: 0 });
          }
        } catch (error) {
          console.error(`Error reading from SQLite table ${tableName}:`, error);
        }
      }

      return null;
    },

    setItem: async (name: string, value: string): Promise<void> => {
      // Use province-specific storage key
      const storageKey = getProvinceStorageKey(name);

      // Always save to localStorage as backup with province prefix
      localStorage.setItem(storageKey, value);

      // Only sync to SQLite when we are in Electron AND a province is selected
      if (isElectron() && isProvinceSelected() && window.electronAPI?.db) {
        try {
          const parsed = JSON.parse(value);
          const state = parsed.state;
          await syncStateToSQLite(tableName, state);
        } catch (error) {
          console.error(`Error writing to SQLite table ${tableName}:`, error);
        }
      }
    },
    
    removeItem: async (name: string): Promise<void> => {
      const storageKey = getProvinceStorageKey(name);
      localStorage.removeItem(storageKey);
      // SQLite data persists - clearing would need explicit action
    },
  };
}

// Convert SQLite rows to Zustand state format
function convertRowsToState(tableName: string, rows: any[]): any {
  // Parse JSON fields that were stringified
  const parsed = rows.map(row => {
    const result: any = { ...row };
    // Parse any stringified JSON fields
    for (const key of Object.keys(result)) {
      if (typeof result[key] === 'string') {
        try {
          // Try to parse if it looks like JSON
          if (result[key].startsWith('{') || result[key].startsWith('[')) {
            result[key] = JSON.parse(result[key]);
          }
        } catch {
          // Keep as string if not valid JSON
        }
      }
    }
    return result;
  });

  // Map table names to their state key
  const stateKeyMap: Record<string, string> = {
    employees: 'employees',
    branches: 'branches',
    deductions: 'deductions',
    payroll_records: 'entries',
    holidays: 'records',
    users: 'users',
    settings: 'settings',
  };

  const stateKey = stateKeyMap[tableName];
  
  // Special handling for settings (single row) and auth (users + currentUser)
  if (tableName === 'settings') {
    return { settings: parsed[0] || {} };
  }
  
  if (tableName === 'users') {
    return { 
      users: parsed,
      currentUser: null,
      isAuthenticated: false,
    };
  }

  // Special handling for branches - map SQLite columns to JS property names
  if (tableName === 'branches') {
    const branches = parsed.map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code || '',
      province: row.province || '',
      city: row.city || '',
      address: row.address || '',
      phone: row.phone || '',
      email: row.email || '',
      manager: row.manager || '',
      isHeadquarters: row.is_headquarters === 1,
      isActive: row.is_active !== 0,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));
    return { branches };
  }

  // Special handling for payroll - has both periods and entries
  if (tableName === 'payroll_records') {
    // Separate periods from entries
    const periods = parsed.filter((r: any) => r.recordType === 'period');
    const entries = parsed.filter((r: any) => r.recordType === 'entry');
    return { periods, entries };
  }

  return { [stateKey]: parsed };
}

// Sync Zustand state to SQLite
async function syncStateToSQLite(tableName: string, state: any): Promise<void> {
  if (!window.electronAPI) return;

  try {
    // Get current data from SQLite
    const existingRows = await window.electronAPI.db.getAll(tableName);
    const existingIds = new Set(existingRows.map((r: any) => r.id));

    // Determine which array to sync based on table
    let itemsToSync: any[] = [];
    
    if (tableName === 'employees' && state.employees) {
      itemsToSync = state.employees;
    } else if (tableName === 'branches' && state.branches) {
      // Map branch fields to SQLite column names
      itemsToSync = state.branches.map((b: any) => ({
        id: b.id,
        name: b.name,
        code: b.code || null,
        province: b.province || null,
        city: b.city || null,
        address: b.address || null,
        phone: b.phone || null,
        email: b.email || null,
        manager: b.manager || null,
        is_headquarters: b.isHeadquarters ? 1 : 0,
        is_active: b.isActive !== false ? 1 : 0,
        created_at: b.createdAt || new Date().toISOString(),
        updated_at: b.updatedAt || new Date().toISOString(),
      }));
    } else if (tableName === 'deductions' && state.deductions) {
      itemsToSync = state.deductions;
    } else if (tableName === 'holidays' && state.records) {
      // Holidays don't have IDs, create composite ID
      itemsToSync = state.records.map((r: any) => ({
        ...r,
        id: `${r.employeeId}-${r.year}`,
      }));
    } else if (tableName === 'users' && state.users) {
      itemsToSync = state.users;
    } else if (tableName === 'settings' && state.settings) {
      // Settings is a single object
      const settingsData = {
        id: 'main',
        ...state.settings,
      };
      if (existingRows.length > 0) {
        await window.electronAPI.db.update(tableName, 'main', settingsData);
      } else {
        await window.electronAPI.db.insert(tableName, settingsData);
      }
      return;
    } else if (tableName === 'payroll_records') {
      // Handle both periods and entries
      const periods = (state.periods || []).map((p: any) => ({
        ...p,
        recordType: 'period',
        data: JSON.stringify(p),
      }));
      const entries = (state.entries || []).map((e: any) => ({
        ...e,
        recordType: 'entry',
        employee: JSON.stringify(e.employee),
        data: JSON.stringify(e),
      }));
      itemsToSync = [...periods, ...entries];
    }

    // Sync items
    for (const item of itemsToSync) {
      // Prepare data for SQLite (stringify complex objects)
      const preparedItem = prepareForSQLite(item);
      
      if (existingIds.has(item.id)) {
        await window.electronAPI.db.update(tableName, item.id, preparedItem);
        existingIds.delete(item.id);
      } else {
        await window.electronAPI.db.insert(tableName, preparedItem);
      }
    }

    // Delete items that were removed from state
    const itemIds = new Set(itemsToSync.map((i: any) => i.id));
    for (const id of existingIds) {
      if (!itemIds.has(id)) {
        await window.electronAPI.db.delete(tableName, id);
      }
    }
  } catch (error) {
    console.error(`Error syncing to SQLite table ${tableName}:`, error);
  }
}

// Prepare object for SQLite by stringifying nested objects
function prepareForSQLite(obj: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = JSON.stringify(value);
    } else if (Array.isArray(value)) {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Initialize data from SQLite on app start
export async function initializeFromSQLite(): Promise<void> {
  if (!isElectron()) return;
  
  console.log('Initializing data from SQLite...');
  // The stores will automatically load from SQLite via the storage adapter
}
