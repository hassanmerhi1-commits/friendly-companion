/**
 * Database Sync - Bridge between Zustand stores and SQLite database
 * 
 * In Electron: Reads from and writes to SQLite database
 * In Browser: Falls back to localStorage (development only)
 */

// Check if running in Electron
function isElectron(): boolean {
  return typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;
}

// Get all records from a table
export async function dbGetAll<T>(table: string): Promise<T[]> {
  if (!isElectron()) {
    return [];
  }
  
  try {
    const result = await (window as any).electronAPI.db.getAll(table);
    return result || [];
  } catch (error) {
    console.error(`[DB] Error getting all from ${table}:`, error);
    return [];
  }
}

// Get a single record by ID
export async function dbGetById<T>(table: string, id: string): Promise<T | null> {
  if (!isElectron()) {
    return null;
  }
  
  try {
    const result = await (window as any).electronAPI.db.getById(table, id);
    return result || null;
  } catch (error) {
    console.error(`[DB] Error getting ${id} from ${table}:`, error);
    return null;
  }
}

// Insert or replace a record
export async function dbInsert(table: string, data: Record<string, any>): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.insert(table, data);
    return result?.success === true;
  } catch (error) {
    console.error(`[DB] Error inserting into ${table}:`, error);
    return false;
  }
}

// Update a record
export async function dbUpdate(table: string, id: string, data: Record<string, any>): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.update(table, id, data);
    return result?.success === true;
  } catch (error) {
    console.error(`[DB] Error updating ${table}:`, error);
    return false;
  }
}

// Delete a record
export async function dbDelete(table: string, id: string): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.delete(table, id);
    return result?.success === true;
  } catch (error) {
    console.error(`[DB] Error deleting from ${table}:`, error);
    return false;
  }
}

// Execute a raw query
export async function dbQuery<T>(sql: string, params: any[] = []): Promise<T[]> {
  if (!isElectron()) {
    return [];
  }
  
  try {
    const result = await (window as any).electronAPI.db.query(sql, params);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`[DB] Error executing query:`, error);
    return [];
  }
}

// Check database connection status
export async function dbGetStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  exists: boolean;
  path: string | null;
  error?: string;
}> {
  if (!isElectron()) {
    return { configured: false, connected: false, exists: false, path: null };
  }
  
  try {
    return await (window as any).electronAPI.db.getStatus();
  } catch (error) {
    console.error('[DB] Error getting status:', error);
    return { configured: false, connected: false, exists: false, path: null, error: String(error) };
  }
}

// Initialize database connection
export async function dbInit(): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }
  
  try {
    const result = await (window as any).electronAPI.db.init();
    return result?.success === true;
  } catch (error) {
    console.error('[DB] Error initializing:', error);
    return false;
  }
}
