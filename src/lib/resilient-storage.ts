/**
 * Resilient Storage - Dual localStorage + IndexedDB persistence
 * 
 * Safari in standalone/PWA mode can wipe localStorage unpredictably.
 * This module saves critical keys to both localStorage AND IndexedDB,
 * recovering from IndexedDB if localStorage is empty on startup.
 */

const DB_NAME = 'payroll_resilient';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[ResilientStorage] IndexedDB open failed:', request.error);
        reject(request.error);
      };
    } catch (e) {
      console.warn('[ResilientStorage] IndexedDB not available');
      reject(e);
    }
  });
  
  return dbPromise;
}

async function idbGet(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silent fail
  }
}

/**
 * Save a value to both localStorage and IndexedDB
 */
export async function resilientSet(key: string, value: string): Promise<void> {
  try { localStorage.setItem(key, value); } catch {}
  await idbSet(key, value);
}

/**
 * Get a value, trying localStorage first, falling back to IndexedDB.
 * If recovered from IndexedDB, re-populate localStorage.
 */
export async function resilientGet(key: string): Promise<string | null> {
  // Try localStorage first
  try {
    const lsValue = localStorage.getItem(key);
    if (lsValue !== null) return lsValue;
  } catch {}
  
  // Fallback to IndexedDB
  const idbValue = await idbGet(key);
  if (idbValue !== null) {
    console.log(`[ResilientStorage] Recovered "${key}" from IndexedDB`);
    // Re-populate localStorage
    try { localStorage.setItem(key, idbValue); } catch {}
  }
  return idbValue;
}

/**
 * Restore all critical keys from IndexedDB into localStorage on startup.
 * Call once at app boot.
 */
export async function restoreCriticalKeys(): Promise<void> {
  const criticalKeys = [
    'payroll_active_company_id',
    'payroll_server_info',
    'payroll_auth_session',
  ];
  
  for (const key of criticalKeys) {
    try {
      const lsValue = localStorage.getItem(key);
      if (!lsValue) {
        const idbValue = await idbGet(key);
        if (idbValue) {
          console.log(`[ResilientStorage] Restored "${key}" from IndexedDB`);
          localStorage.setItem(key, idbValue);
        }
      } else {
        // Ensure IndexedDB has latest localStorage value
        await idbSet(key, lsValue);
      }
    } catch {}
  }
}
