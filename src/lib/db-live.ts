/**
 * Database Live - Direct database access layer
 * 
 * TRUE PUSH-BASED SYNC:
 * - Server broadcasts FULL TABLE DATA after every write
 * - Clients receive rows directly and update stores - NO refetch needed
 * - Zero round-trips after initial connection
 * 
 * MULTI-COMPANY SUPPORT:
 * - activeCompanyId is included in all database operations
 * - Sync events are filtered by companyId
 * 
 * MOCK MODE (Browser Preview):
 * - Uses localStorage when not in Electron for testing UI flows
 */

// ============= ACTIVE COMPANY =============
import { resilientSet, resilientGet } from './resilient-storage';
import { useConnectionStore } from './connection-store';

let activeCompanyId: string | null = null;

export function setActiveCompanyId(id: string | null) {
  activeCompanyId = id;
  console.log('[DB-Live] Active company set to:', id);
  // Persist for PWA reconnection (dual storage)
  if (id) {
    resilientSet('payroll_active_company_id', id);
  }
}

export function getActiveCompanyId(): string | null {
  return activeCompanyId;
}

// Check if running in Electron
function isElectron(): boolean {
  return typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;
}

// ============= BROWSER WEBSOCKET MODE =============
// When accessing via HTTP from a phone/browser, connect directly via WebSocket
let browserWs: WebSocket | null = null;
let browserWsConnected = false;
let browserWsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let browserServerInfo: { wsPort: number; computerName: string; localIPs: string[] } | null = null;
const pendingBrowserRequests = new Map<string, { resolve: (value: any) => void; reject: (reason: any) => void; timer: ReturnType<typeof setTimeout> }>();

function isBrowserRemoteMode(): boolean {
  if (isElectron()) return false;
  // We're in browser remote mode if we've successfully connected or have server info
  // OR if the URL is not a lovable preview / localhost:5173 dev server
  const host = window.location.hostname;
  const isPreview = host.includes('lovable') || host.includes('localhost') || host === '127.0.0.1';
  return !isPreview || browserWsConnected;
}

async function fetchServerInfo(): Promise<typeof browserServerInfo> {
  try {
    const origin = window.location.origin;
    // Force bypass service worker cache
    const res = await fetch(`${origin}/api/server-info`, { cache: 'no-store' });
    if (res.ok) {
      browserServerInfo = await res.json();
      console.log('[Browser-WS] Server info:', browserServerInfo);
      // Persist server info so PWA can reconnect after home screen launch (dual storage)
      resilientSet('payroll_server_info', JSON.stringify({
        host: window.location.hostname,
        wsPort: browserServerInfo!.wsPort,
        computerName: browserServerInfo!.computerName,
      }));
      return browserServerInfo;
    }
  } catch (e) {
    console.log('[Browser-WS] Not served from PayrollAO server, checking saved info...');
    // Try to use saved server info (PWA launched from home screen)
    try {
      const saved = localStorage.getItem('payroll_server_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        browserServerInfo = {
          wsPort: parsed.wsPort || 4545,
          computerName: parsed.computerName || 'Server',
          localIPs: [parsed.host],
        };
        console.log('[Browser-WS] Using saved server info:', browserServerInfo);
        return browserServerInfo;
      }
    } catch {}
  }
  return null;
}

function connectBrowserWebSocket() {
  if (browserWs && (browserWs.readyState === WebSocket.OPEN || browserWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const host = window.location.hostname;
  const wsPort = browserServerInfo?.wsPort || 4545;
  const url = `ws://${host}:${wsPort}`;
  
  console.log(`[Browser-WS] Connecting to ${url}`);
  
  browserWs = new WebSocket(url);
  
  browserWs.onopen = () => {
    console.log('[Browser-WS] ✅ Connected');
    browserWsConnected = true;
    if (browserWsReconnectTimer) {
      clearTimeout(browserWsReconnectTimer);
      browserWsReconnectTimer = null;
    }
    
    // If we have an active company, set it
    if (activeCompanyId) {
      sendBrowserRequest({ action: 'setCompany', companyId: activeCompanyId });
    }
  };
  
  browserWs.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      
      // Handle sync broadcasts
      if (msg.type === 'db-sync') {
        if (msg.companyId && activeCompanyId && msg.companyId !== activeCompanyId) return;
        console.log(`[Browser-WS] ← SYNC: ${msg.table} (${msg.rows?.length || 0} rows)`);
        notifyTableSync(msg.table, msg.rows || []);
        return;
      }
      
      // Handle request responses
      if (msg.requestId && pendingBrowserRequests.has(msg.requestId)) {
        const pending = pendingBrowserRequests.get(msg.requestId)!;
        clearTimeout(pending.timer);
        pendingBrowserRequests.delete(msg.requestId);
        pending.resolve(msg);
      }
    } catch (e) {
      console.error('[Browser-WS] Parse error:', e);
    }
  };
  
  browserWs.onclose = () => {
    console.log('[Browser-WS] ❌ Disconnected');
    browserWsConnected = false;
    browserWs = null;
    scheduleBrowserReconnect();
  };
  
  browserWs.onerror = (err) => {
    console.error('[Browser-WS] Error:', err);
  };
}

function scheduleBrowserReconnect() {
  if (browserWsReconnectTimer) return;
  browserWsReconnectTimer = setTimeout(() => {
    browserWsReconnectTimer = null;
    if (!browserWsConnected && browserServerInfo) {
      connectBrowserWebSocket();
    }
  }, 3000);
}

function sendBrowserRequest(request: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!browserWs || browserWs.readyState !== WebSocket.OPEN) {
      reject(new Error('Not connected to server'));
      return;
    }
    
    const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const timer = setTimeout(() => {
      pendingBrowserRequests.delete(requestId);
      reject(new Error('Request timeout'));
    }, 30000);
    
    pendingBrowserRequests.set(requestId, { resolve, reject, timer });
    browserWs.send(JSON.stringify({ ...request, requestId }));
  });
}

// Initialize browser WebSocket mode
export async function initBrowserWSMode(): Promise<boolean> {
  if (isElectron()) return false;
  
  const info = await fetchServerInfo();
  if (!info) return false;
  
  // Restore saved company ID for PWA reconnection
  if (!activeCompanyId) {
    const savedCompanyId = localStorage.getItem('payroll_active_company_id');
    if (savedCompanyId) {
      activeCompanyId = savedCompanyId;
      console.log('[Browser-WS] Restored company ID:', savedCompanyId);
    }
  }
  
  connectBrowserWebSocket();
  return true;
}

// ============= MOCK STORAGE (for browser preview testing) =============
const MOCK_STORAGE_PREFIX = 'payroll_mock_';
const MOCK_COMPANIES_KEY = 'payroll_mock_companies';
const LEGACY_COMPANY_ID = 'legacy';

const LEGACY_MOCK_TABLES = [
  'employees',
  'holidays',
  'branches',
  'deductions',
  'payroll_periods',
  'payroll_entries',
  'absences',
  'users',
  'settings',
  'disciplinary_records',
  'terminations',
  'salary_adjustments',
  'loans',
  'documents',
  'attendance',
] as const;

function migrateLegacyMockDataToCompany(companyId: string): void {
  const targetPrefix = `${MOCK_STORAGE_PREFIX}${companyId}_`;

  for (const table of LEGACY_MOCK_TABLES) {
    const legacyKey = `${MOCK_STORAGE_PREFIX}${table}`;
    const targetKey = `${targetPrefix}${table}`;
    const legacyData = localStorage.getItem(legacyKey);

    if (legacyData && !localStorage.getItem(targetKey)) {
      localStorage.setItem(targetKey, legacyData);
    }
  }
}

function getPrimaryPreviewCompanyId(
  companies: Array<{ id: string; name: string; dbFile: string }>
): string | null {
  if (!Array.isArray(companies) || companies.length === 0) return null;
  return (
    companies.find((company) => company.id === 'company-default')?.id ||
    companies.find((company) => company.id === LEGACY_COMPANY_ID)?.id ||
    companies.find((company) => company.name === 'Empresa Principal')?.id ||
    companies[0].id
  );
}

function getMockData<T>(table: string): T[] {
  try {
    const prefix = activeCompanyId ? `${MOCK_STORAGE_PREFIX}${activeCompanyId}_` : MOCK_STORAGE_PREFIX;
    const data = localStorage.getItem(`${prefix}${table}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setMockData(table: string, data: any[]): void {
  const prefix = activeCompanyId ? `${MOCK_STORAGE_PREFIX}${activeCompanyId}_` : MOCK_STORAGE_PREFIX;
  localStorage.setItem(`${prefix}${table}`, JSON.stringify(data));
  // Notify listeners about the change
  notifyTableSync(table, data);
}

function generateId(): string {
  return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Initialize mock data with sample employees for testing
export function initMockData(): void {
  if (isElectron()) return;
  
  const employees = getMockData('employees');
  if (employees.length === 0) {
    const sampleEmployees = [
      {
        id: 'emp-001',
        name: 'João Silva',
        position: 'Analista',
        department: 'TI',
        base_salary: 250000,
        hire_date: '2022-01-15',
        status: 'active',
        created_at: new Date().toISOString(),
      },
      {
        id: 'emp-002',
        name: 'Maria Santos',
        position: 'Gerente',
        department: 'RH',
        base_salary: 350000,
        hire_date: '2021-06-01',
        status: 'active',
        created_at: new Date().toISOString(),
      },
      {
        id: 'emp-003',
        name: 'Pedro Costa',
        position: 'Técnico',
        department: 'Operações',
        base_salary: 180000,
        hire_date: '2023-03-20',
        status: 'active',
        created_at: new Date().toISOString(),
      },
    ];
    setMockData('employees', sampleEmployees);
    console.log('[DB-Live] Mock data initialized with', sampleEmployees.length, 'employees');
  }
  
  // Ensure other tables exist
  ['holidays', 'branches', 'deductions', 'payroll_periods', 'payroll_entries', 'absences', 'users', 'settings', 'disciplinary_records', 'terminations', 'salary_adjustments', 'loans', 'documents'].forEach(table => {
    const prefix = activeCompanyId ? `${MOCK_STORAGE_PREFIX}${activeCompanyId}_` : MOCK_STORAGE_PREFIX;
    if (!localStorage.getItem(`${prefix}${table}`)) {
      setMockData(table, []);
    }
  });
}

// ============= COMPANY MANAGEMENT =============

export async function liveListCompanies(): Promise<Array<{ id: string; name: string; dbFile: string }>> {
  if (isBrowserRemoteMode()) {
    try {
      const response = await sendBrowserRequest({ action: 'listCompanies' });
      return response.data || [];
    } catch (e) {
      console.error('[Browser-WS] listCompanies failed:', e);
      return [];
    }
  }
  
  if (!isElectron()) {
    // Mock: return companies from localStorage
    try {
      const data = localStorage.getItem(MOCK_COMPANIES_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // CRITICAL: preserve pre-multi-company data by migrating legacy keys
          // into the primary company namespace even when registry already exists.
          const primaryCompanyId = getPrimaryPreviewCompanyId(parsed);
          if (primaryCompanyId) {
            migrateLegacyMockDataToCompany(primaryCompanyId);
          }
          return parsed;
        }
      }
    } catch {
      // fall through to recreate default company registry
    }

    // Guarantee at least one company in preview mode and migrate legacy single-db mock data
    const defaultCompany = {
      id: LEGACY_COMPANY_ID,
      name: 'Empresa Principal',
      dbFile: 'legacy-preview.db',
    };

    migrateLegacyMockDataToCompany(defaultCompany.id);
    localStorage.setItem(MOCK_COMPANIES_KEY, JSON.stringify([defaultCompany]));
    return [defaultCompany];
  }
  
  try {
    return await (window as any).electronAPI.company.list();
  } catch (error) {
    console.error('[DB-Live] Error listing companies:', error);
    return [];
  }
}

export async function liveCreateCompany(name: string): Promise<{ success: boolean; company?: any; error?: string }> {
  if (isBrowserRemoteMode()) {
    try {
      return await sendBrowserRequest({ action: 'createCompany', name });
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }
  
  if (!isElectron()) {
    // Mock: add to localStorage
    const companies = await liveListCompanies();
    const newCompany = { id: `mock-${Date.now()}`, name, dbFile: `mock-${name}.db` };
    companies.push(newCompany);
    localStorage.setItem(MOCK_COMPANIES_KEY, JSON.stringify(companies));
    return { success: true, company: newCompany };
  }
  
  try {
    return await (window as any).electronAPI.company.create(name);
  } catch (error) {
    console.error('[DB-Live] Error creating company:', error);
    return { success: false, error: String(error) };
  }
}

export async function liveSetActiveCompany(companyId: string): Promise<boolean> {
  setActiveCompanyId(companyId);
  
  if (isBrowserRemoteMode()) {
    try {
      const result = await sendBrowserRequest({ action: 'setCompany', companyId });
      return result?.success === true;
    } catch (e) {
      console.error('[Browser-WS] setCompany failed:', e);
      return false;
    }
  }
  
  if (!isElectron()) return true;
  
  try {
    const result = await (window as any).electronAPI.company.setActive(companyId);
    return result?.success === true;
  } catch (error) {
    console.error('[DB-Live] Error setting active company:', error);
    return false;
  }
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
    api.onDatabaseSync((data: { table: string; rows: any[]; companyId?: string }) => {
      // Filter: only apply data for the active company
      if (data.companyId && activeCompanyId && data.companyId !== activeCompanyId) {
        console.log(`[DB-Live] ← SYNC ignored: ${data.table} (company=${data.companyId}, active=${activeCompanyId})`);
        return;
      }
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
  if (isBrowserRemoteMode()) {
    try {
      const response = await sendBrowserRequest({ action: 'getAll', table, companyId: activeCompanyId });
      return response.data || [];
    } catch (e) {
      console.error(`[Browser-WS] getAll ${table} failed:`, e);
      return [];
    }
  }
  
  if (!isElectron()) {
    const data = getMockData<T>(table);
    console.log(`[DB-Live/Mock] getAll ${table}:`, data.length, 'rows');
    return data;
  }
  
  try {
    const result = await (window as any).electronAPI.db.getAll(table, activeCompanyId);
    return result || [];
  } catch (error) {
    console.error(`[DB-Live] Error getting all from ${table}:`, error);
    return [];
  }
}

export async function liveGetById<T>(table: string, id: string): Promise<T | null> {
  if (isBrowserRemoteMode()) {
    try {
      const response = await sendBrowserRequest({ action: 'getById', table, id, companyId: activeCompanyId });
      return response.data || null;
    } catch (e) {
      console.error(`[Browser-WS] getById ${table}/${id} failed:`, e);
      return null;
    }
  }
  
  if (!isElectron()) {
    const data = getMockData<any>(table);
    return data.find((row: any) => row.id === id) || null;
  }
  
  try {
    const result = await (window as any).electronAPI.db.getById(table, id, activeCompanyId);
    return result || null;
  } catch (error) {
    console.error(`[DB-Live] Error getting ${id} from ${table}:`, error);
    return null;
  }
}

export async function liveQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
  if (isBrowserRemoteMode()) {
    try {
      const response = await sendBrowserRequest({ action: 'query', sql, params, companyId: activeCompanyId });
      return Array.isArray(response.data) ? response.data : [];
    } catch (e) {
      console.error(`[Browser-WS] query failed:`, e);
      return [];
    }
  }
  
  if (!isElectron()) {
    return [];
  }
  
  try {
    const result = await (window as any).electronAPI.db.query(sql, params, activeCompanyId);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`[DB-Live] Error executing query:`, error);
    return [];
  }
}

// ============= LIVE WRITE OPERATIONS =============
// Note: After write, server will broadcast full table data - no local notification needed

export async function liveInsert(table: string, data: Record<string, any>): Promise<boolean> {
  if (isBrowserRemoteMode()) {
    try {
      const response = await sendBrowserRequest({ action: 'insert', table, data, companyId: activeCompanyId });
      return response?.success === true;
    } catch (e) {
      console.error(`[Browser-WS] insert ${table} failed:`, e);
      return false;
    }
  }
  
  if (!isElectron()) {
    const existing = getMockData<any>(table);
    const newData = { ...data, id: data.id || generateId() };
    const existingIndex = existing.findIndex((row: any) => row.id === newData.id);
    if (existingIndex >= 0) {
      existing[existingIndex] = { ...existing[existingIndex], ...newData };
    } else {
      existing.push(newData);
    }
    setMockData(table, existing);
    return true;
  }
  
  try {
    const result = await (window as any).electronAPI.db.insert(table, data, activeCompanyId);
    if (result?.success !== true) {
      console.error(`[DB-Live] Insert failed for ${table}:`, result?.error || result);
    }
    // Server will broadcast full table data - no local action needed
    return result?.success === true;
  } catch (error) {
    console.error(`[DB-Live] Error inserting into ${table}:`, error);
    return false;
  }
}

export async function liveUpdate(table: string, id: string, data: Record<string, any>): Promise<boolean> {
  if (isBrowserRemoteMode()) {
    try {
      const response = await sendBrowserRequest({ action: 'update', table, id, data, companyId: activeCompanyId });
      return response?.success === true;
    } catch (e) {
      console.error(`[Browser-WS] update ${table}/${id} failed:`, e);
      return false;
    }
  }
  
  if (!isElectron()) {
    const existing = getMockData<any>(table);
    const index = existing.findIndex((row: any) => row.id === id);
    if (index >= 0) {
      existing[index] = { ...existing[index], ...data };
      setMockData(table, existing);
      return true;
    }
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.update(table, id, data, activeCompanyId);
    if (result?.success !== true) {
      console.error(`[DB-Live] Update failed for ${table} id=${id}:`, result?.error || result);
    }
    // Server will broadcast full table data - no local action needed
    return result?.success === true;
  } catch (error) {
    console.error(`[DB-Live] Error updating ${table}:`, error);
    return false;
  }
}

export async function liveDelete(table: string, id: string): Promise<boolean> {
  if (isBrowserRemoteMode()) {
    try {
      const response = await sendBrowserRequest({ action: 'delete', table, id, companyId: activeCompanyId });
      return response?.success === true;
    } catch (e) {
      console.error(`[Browser-WS] delete ${table}/${id} failed:`, e);
      return false;
    }
  }
  
  if (!isElectron()) {
    const existing = getMockData<any>(table);
    const filtered = existing.filter((row: any) => row.id !== id);
    if (filtered.length < existing.length) {
      setMockData(table, filtered);
      return true;
    }
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.delete(table, id, activeCompanyId);
    if (result?.success !== true) {
      console.error(`[DB-Live] Delete failed for ${table} id=${id}:`, result?.error || result);
    }
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
