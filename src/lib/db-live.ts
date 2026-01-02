/**
 * Database Live - Direct database access layer
 * 
 * This module provides LIVE database access via Electron IPC.
 * In server mode: Operations go directly to local SQLite
 * In client mode: Operations are transparently routed to server via WebSocket
 * 
 * Real-time sync: Server broadcasts changes to all clients via WebSocket.
 * Clients receive 'payroll:updated' events and refresh their stores.
 */

// Check if running in Electron
function isElectron(): boolean {
  return typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;
}

// Event system for data change notifications
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

// ============= REAL-TIME SYNC SETUP =============
// Listen for database updates from main process (server broadcasts to all clients)

let syncInitialized = false;

export function initSyncListener() {
  if (!isElectron() || syncInitialized) return;
  
  syncInitialized = true;
  
  const api = (window as any).electronAPI;
  if (api?.onDatabaseUpdate) {
    api.onDatabaseUpdate((data: { table: string; action: string; id?: string }) => {
      console.log('[DB-Live] ← Received update:', data.table, data.action, data.id || '');

      // Special event: refresh everything (e.g. when a client connects or after import)
      if (data.table === 'all') {
        const tables = [
          'employees',
          'branches',
          'deductions',
          'payroll_periods',
          'payroll_entries',
          'holidays',
          'absences',
          'users',
          'settings',
          'documents',
        ];

        for (const t of tables) {
          notifyDataChange(t, 'update', data.id);
        }
        return;
      }

      notifyDataChange(data.table, data.action as any, data.id);
    });
    console.log('[DB-Live] Sync listener initialized');
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

export async function liveInsert(table: string, data: Record<string, any>): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.insert(table, data);
    if (result?.success === true) {
      // Local notification for immediate UI update
      notifyDataChange(table, 'insert', data.id);
      return true;
    }
    return false;
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
    if (result?.success === true) {
      notifyDataChange(table, 'update', id);
      return true;
    }
    return false;
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
    if (result?.success === true) {
      notifyDataChange(table, 'delete', id);
      return true;
    }
    return false;
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
// These are no longer needed but kept for any code that might reference them

export function connectToSyncServer(_serverAddress: string, _port: number = 4545) {
  // No-op: Sync is now handled automatically via main process
  console.log('[DB-Live] connectToSyncServer is deprecated - sync is automatic');
  initSyncListener();
}

export function disconnectFromSyncServer() {
  // No-op
  console.log('[DB-Live] disconnectFromSyncServer is deprecated');
}

export function isSyncConnected(): boolean {
  // Always return true if in electron - sync is handled by main process
  return isElectron();
}

export function getSyncStatus(): { connected: boolean; url: string | null; connectedOnce: boolean } {
  // Sync status is now determined by DB connection status
  return {
    connected: isElectron(),
    url: null,
    connectedOnce: isElectron(),
  };
}
