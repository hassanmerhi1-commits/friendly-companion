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
let wsConnectedOnce = false;

export function connectToSyncServer(serverAddress: string, port: number = 9001) {
  const newUrl = `ws://${serverAddress}:${port}`;
  
  // Avoid reconnecting to same server
  if (wsServerUrl === newUrl && ws && ws.readyState === WebSocket.OPEN) {
    console.log('[DB-Live] Already connected to', newUrl);
    return;
  }
  
  // Disconnect from previous server if any
  if (ws) {
    try { ws.close(); } catch (e) {}
    ws = null;
  }
  
  wsServerUrl = newUrl;
  wsConnectedOnce = false;
  console.log('[DB-Live] Initiating WebSocket connection to:', wsServerUrl);
  initWebSocket();
}

function initWebSocket() {
  if (!wsServerUrl) return;
  
  // Clear any pending reconnect
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  
  try {
    console.log('[DB-Live] Creating WebSocket to:', wsServerUrl);
    ws = new WebSocket(wsServerUrl);
    
    ws.onopen = () => {
      wsConnectedOnce = true;
      console.log('[DB-Live] ✓ Connected to sync server:', wsServerUrl);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[DB-Live] ← Received:', data.type, data.table, data.action, data.id || '');
        if (data.type === 'sync' && data.table) {
          notifyDataChange(data.table, data.action || 'update', data.id);
        }
      } catch (e) {
        console.error('[DB-Live] Error parsing sync message:', e);
      }
    };
    
    ws.onerror = (error) => {
      console.error('[DB-Live] ✗ WebSocket error - Check if port 9001 is open on server firewall');
    };
    
    ws.onclose = (event) => {
      console.log('[DB-Live] WebSocket closed, code:', event.code, 'reason:', event.reason || 'none');
      ws = null;
      
      // Only reconnect if we have a server URL
      if (wsServerUrl) {
        const delay = wsConnectedOnce ? 3000 : 5000;
        console.log(`[DB-Live] Reconnecting in ${delay/1000}s...`);
        wsReconnectTimer = setTimeout(initWebSocket, delay);
      }
    };
  } catch (error) {
    console.error('[DB-Live] Error creating WebSocket:', error);
    // Retry connection
    wsReconnectTimer = setTimeout(initWebSocket, 5000);
  }
}

export function disconnectFromSyncServer() {
  console.log('[DB-Live] Disconnecting from sync server');
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  if (ws) {
    try { ws.close(); } catch (e) {}
    ws = null;
  }
  wsServerUrl = null;
  wsConnectedOnce = false;
}

export function isSyncConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

export function getSyncStatus(): { connected: boolean; url: string | null; connectedOnce: boolean } {
  return {
    connected: isSyncConnected(),
    url: wsServerUrl,
    connectedOnce: wsConnectedOnce,
  };
}
