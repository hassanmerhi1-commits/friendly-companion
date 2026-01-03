/**
 * Database Live - Direct database access layer
 * 
 * TRUE PUSH-BASED SYNC:
 * - Server broadcasts FULL TABLE DATA after every write
 * - Clients receive rows directly and update stores - NO refetch needed
 * - Zero round-trips after initial connection
 */

// Check if running in Electron
function isElectron(): boolean {
  return typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;
}

// ============= PUSH-BASED SYNC SYSTEM =============
// Stores subscribe to receive FULL TABLE DATA directly from server

type SyncListener = (table: string, rows: any[]) => void;
const syncListeners: Map<string, Set<SyncListener>> = new Map();

// Subscribe to receive full table data when it changes
export function onTableSync(table: string, listener: SyncListener): () => void {
  if (!syncListeners.has(table)) {
    syncListeners.set(table, new Set());
  }
  syncListeners.get(table)!.add(listener);
  
  return () => {
    syncListeners.get(table)?.delete(listener);
  };
}

function notifyTableSync(table: string, rows: any[]) {
  const listeners = syncListeners.get(table);
  if (listeners) {
    listeners.forEach(listener => {
      try {
        listener(table, rows);
      } catch (e) {
        console.error(`[DB-Live] Error in sync listener for ${table}:`, e);
      }
    });
  }
}

// Legacy: Event system for data change notifications (kept for compatibility)
type DataChangeListener = (table: string, action: 'insert' | 'update' | 'delete', id?: string) => void;
const dataChangeListeners: Set<DataChangeListener> = new Set();

export function onDataChange(listener: DataChangeListener): () => void {
  dataChangeListeners.add(listener);
  return () => dataChangeListeners.delete(listener);
}

function notifyDataChange(table: string, action: 'insert' | 'update' | 'delete', id?: string) {
  dataChangeListeners.forEach(listener => {
    try {
      listener(table, action, id);
    } catch (e) {
      console.error('[DB-Live] Error in data change listener:', e);
    }
  });
}

// ============= SYNC LISTENER INITIALIZATION =============
let syncInitialized = false;

export function initSyncListener() {
  if (!isElectron() || syncInitialized) return;
  
  syncInitialized = true;
  
  const api = (window as any).electronAPI;
  
  // PRIMARY: Listen for full table data (TRUE PUSH)
  if (api?.onDatabaseSync) {
    api.onDatabaseSync((data: { table: string; rows: any[] }) => {
      console.log(`[DB-Live] ← SYNC: ${data.table} (${data.rows?.length || 0} rows)`);
      notifyTableSync(data.table, data.rows || []);
    });
    console.log('[DB-Live] Push sync listener initialized');
  }
  
  // FALLBACK: Legacy notification listener (for old broadcasts)
  if (api?.onDatabaseUpdate) {
    api.onDatabaseUpdate((data: { table: string; action: string; id?: string }) => {
      console.log('[DB-Live] ← Legacy update:', data.table, data.action, data.id || '');

      // Handle 'all' table refresh (import/connect events)
      if (data.table === 'all') {
        const tables = [
          'employees', 'branches', 'deductions', 'payroll_periods',
          'payroll_entries', 'holidays', 'absences', 'users', 'settings', 'documents',
        ];
        for (const t of tables) {
          notifyDataChange(t, 'update', data.id);
        }
        return;
      }

      notifyDataChange(data.table, data.action as any, data.id);
    });
    console.log('[DB-Live] Legacy update listener initialized');
  }
}

// ============= LIVE READ OPERATIONS =============

export async function liveGetAll<T>(table: string): Promise<T[]> {
  if (!isElectron()) {
    console.warn('[DB-Live] Not in Electron environment');
    return [];
  }
  
  try {
    const result = await (window as any).electronAPI.db.getAll(table);
    return result || [];
  } catch (error) {
    console.error(`[DB-Live] Error getting all from ${table}:`, error);
    return [];
  }
}

export async function liveGetById<T>(table: string, id: string): Promise<T | null> {
  if (!isElectron()) {
    return null;
  }
  
  try {
    const result = await (window as any).electronAPI.db.getById(table, id);
    return result || null;
  } catch (error) {
    console.error(`[DB-Live] Error getting ${id} from ${table}:`, error);
    return null;
  }
}

export async function liveQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
  if (!isElectron()) {
    return [];
  }
  
  try {
    const result = await (window as any).electronAPI.db.query(sql, params);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`[DB-Live] Error executing query:`, error);
    return [];
  }
}

// ============= LIVE WRITE OPERATIONS =============
// Note: After write, server will broadcast full table data - no local notification needed

export async function liveInsert(table: string, data: Record<string, any>): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.insert(table, data);
    // Server will broadcast full table data - no local action needed
    return result?.success === true;
  } catch (error) {
    console.error(`[DB-Live] Error inserting into ${table}:`, error);
    return false;
  }
}

export async function liveUpdate(table: string, id: string, data: Record<string, any>): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.update(table, id, data);
    // Server will broadcast full table data - no local action needed
    return result?.success === true;
  } catch (error) {
    console.error(`[DB-Live] Error updating ${table}:`, error);
    return false;
  }
}

export async function liveDelete(table: string, id: string): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.delete(table, id);
    // Server will broadcast full table data - no local action needed
    return result?.success === true;
  } catch (error) {
    console.error(`[DB-Live] Error deleting from ${table}:`, error);
    return false;
  }
}

// ============= DATABASE STATUS =============

export interface DBStatus {
  configured: boolean;
  connected: boolean;
  exists: boolean | null;
  path: string | null;
  isServer?: boolean;
  isClient?: boolean;
  serverAddress?: string | null;
  wsServerRunning?: boolean;
  wsPort?: number;
  wsClients?: number;
  wsClientConnected?: boolean;
  error?: string;
}

export async function liveGetStatus(): Promise<DBStatus> {
  if (!isElectron()) {
    return { configured: false, connected: false, exists: false, path: null };
  }
  
  try {
    return await (window as any).electronAPI.db.getStatus();
  } catch (error) {
    console.error('[DB-Live] Error getting status:', error);
    return { configured: false, connected: false, exists: false, path: null, error: String(error) };
  }
}

export async function liveInit(): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.init();
    
    // Initialize sync listener after DB init
    initSyncListener();
    
    return result?.success === true;
  } catch (error) {
    console.error('[DB-Live] Error initializing:', error);
    return false;
  }
}

// ============= LEGACY EXPORTS (for compatibility) =============

export function connectToSyncServer(_serverAddress: string, _port: number = 4545) {
  console.log('[DB-Live] connectToSyncServer is deprecated - sync is automatic');
  initSyncListener();
}

export function disconnectFromSyncServer() {
  console.log('[DB-Live] disconnectFromSyncServer is deprecated');
}

export function isSyncConnected(): boolean {
  return isElectron();
}

export function getSyncStatus(): { connected: boolean; url: string | null; connectedOnce: boolean } {
  return {
    connected: isElectron(),
    url: null,
    connectedOnce: isElectron(),
  };
}
