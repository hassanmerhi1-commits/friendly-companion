/**
 * Database Live - Direct database access layer
 * 
 * This module provides LIVE database access - no caching, every read goes directly to the database.
 * This ensures all clients see the same data in real-time when working on the same network.
 * 
 * ARCHITECTURE:
 * - payroll.db is the SINGLE SOURCE OF TRUTH
 * - Every read operation queries the database directly
 * - Every write operation commits directly to the database
 * - No local caching - fresh data on every request
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

// ============= LIVE READ OPERATIONS =============
// These functions ALWAYS read from the database, never from cache

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
// These functions write directly to the database and notify listeners

export async function liveInsert(table: string, data: Record<string, any>): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.insert(table, data);
    if (result?.success === true) {
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

export async function liveGetStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  exists: boolean;
  path: string | null;
  isClient?: boolean;
  serverName?: string | null;
  wsServerRunning?: boolean;
  wsPort?: number;
  wsClients?: number;
  error?: string;
}> {
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
    return result?.success === true;
  } catch (error) {
    console.error('[DB-Live] Error initializing:', error);
    return false;
  }
}

// ============= WEBSOCKET CONNECTION FOR REAL-TIME SYNC =============
// Connect to WebSocket server on the database server PC for instant updates

let ws: WebSocket | null = null;
let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wsServerUrl: string | null = null;

export function connectToSyncServer(serverAddress: string, port: number = 9001) {
  wsServerUrl = `ws://${serverAddress}:${port}`;
  initWebSocket();
}

function initWebSocket() {
  if (!wsServerUrl) return;
  
  try {
    ws = new WebSocket(wsServerUrl);
    
    ws.onopen = () => {
      console.log('[DB-Live] Connected to sync server');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'sync' && data.table) {
          console.log('[DB-Live] Received sync event for table:', data.table);
          notifyDataChange(data.table, data.action || 'update', data.id);
        }
      } catch (e) {
        console.error('[DB-Live] Error parsing sync message:', e);
      }
    };
    
    ws.onerror = (error) => {
      console.error('[DB-Live] WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('[DB-Live] Disconnected from sync server, reconnecting in 3s...');
      ws = null;
      // Reconnect after delay
      if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
      wsReconnectTimer = setTimeout(initWebSocket, 3000);
    };
  } catch (error) {
    console.error('[DB-Live] Error creating WebSocket:', error);
    // Retry connection
    if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
    wsReconnectTimer = setTimeout(initWebSocket, 3000);
  }
}

export function disconnectFromSyncServer() {
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  wsServerUrl = null;
}

export function isSyncConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}
