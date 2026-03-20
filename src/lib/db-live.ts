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
let activeCompanyId: string | null = null;

export function setActiveCompanyId(id: string | null) {
  activeCompanyId = id;
  console.log('[DB-Live] Active company set to:', id);
}

export function getActiveCompanyId(): string | null {
  return activeCompanyId;
}

// Check if running in Electron
function isElectron(): boolean {
  return typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;
}

// ============= MOCK STORAGE (for browser preview testing) =============
const MOCK_STORAGE_PREFIX = 'payroll_mock_';

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
  if (!isElectron()) {
    // Mock: return companies from localStorage
    try {
      const data = localStorage.getItem('payroll_mock_companies');
      if (data) return JSON.parse(data);
    } catch {}
    return [{ id: 'mock-company', name: 'Empresa Demo', dbFile: 'mock.db' }];
  }
  
  try {
    return await (window as any).electronAPI.company.list();
  } catch (error) {
    console.error('[DB-Live] Error listing companies:', error);
    return [];
  }
}

export async function liveCreateCompany(name: string): Promise<{ success: boolean; company?: any; error?: string }> {
  if (!isElectron()) {
    // Mock: add to localStorage
    const companies = await liveListCompanies();
    const newCompany = { id: `mock-${Date.now()}`, name, dbFile: `mock-${name}.db` };
    companies.push(newCompany);
    localStorage.setItem('payroll_mock_companies', JSON.stringify(companies));
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
  if (!isElectron()) {
    // Use mock storage in browser preview
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
  if (!isElectron()) {
    // Use mock storage in browser preview
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
  if (!isElectron()) {
    // Use mock storage in browser preview
    const existing = getMockData<any>(table);
    const newData = { ...data, id: data.id || generateId() };
    
    // Check if record with same ID exists (upsert behavior)
    const existingIndex = existing.findIndex((row: any) => row.id === newData.id);
    if (existingIndex >= 0) {
      existing[existingIndex] = { ...existing[existingIndex], ...newData };
    } else {
      existing.push(newData);
    }
    
    setMockData(table, existing);
    console.log(`[DB-Live/Mock] insert ${table}:`, newData.id);
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
  if (!isElectron()) {
    // Use mock storage in browser preview
    const existing = getMockData<any>(table);
    const index = existing.findIndex((row: any) => row.id === id);
    if (index >= 0) {
      existing[index] = { ...existing[index], ...data };
      setMockData(table, existing);
      console.log(`[DB-Live/Mock] update ${table}:`, id);
      return true;
    }
    console.warn(`[DB-Live/Mock] update failed - not found: ${table}/${id}`);
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
  if (!isElectron()) {
    // Use mock storage in browser preview
    const existing = getMockData<any>(table);
    const filtered = existing.filter((row: any) => row.id !== id);
    if (filtered.length < existing.length) {
      setMockData(table, filtered);
      console.log(`[DB-Live/Mock] delete ${table}:`, id);
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
