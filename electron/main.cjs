/**
 * PayrollAO - Simplified WebSocket Architecture
 * 
 * Server mode: Opens payroll.db, runs WebSocket server on WS_PORT
 * Client mode: No direct DB access, routes all operations via WebSocket to server
 * 
 * Configuration via C:\PayrollAO\IP file:
 *   Server: C:\PayrollAO\payroll.db (local path)
 *   Client: SERVERNAME or 10.0.0.x (server address)
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');

// ============= CONFIGURATION =============
const INSTALL_DIR = 'C:\\PayrollAO';
const IP_FILE_PATH = path.join(INSTALL_DIR, 'IP');
const ACTIVATED_FILE_PATH = path.join(INSTALL_DIR, 'activated.txt');
const WS_PORT = 4545;

// Ensure install directory exists
if (!fs.existsSync(INSTALL_DIR)) {
  try {
    fs.mkdirSync(INSTALL_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create install directory:', err);
  }
}

// Create empty IP file if it doesn't exist (user will configure via setup screen)
const DEFAULT_DB_PATH = path.join(INSTALL_DIR, 'payroll.db');
if (!fs.existsSync(IP_FILE_PATH)) {
  try {
    fs.writeFileSync(IP_FILE_PATH, '', 'utf-8');
    console.log('Created empty IP file at:', IP_FILE_PATH);
  } catch (err) {
    console.error('Failed to create IP file:', err);
  }
}

// ============= GLOBALS =============
let mainWindow = null;
let db = null;
let dbPath = null;
let isServerMode = false;
let serverAddress = null;
let wss = null;
let wsClient = null;
let wsReconnectTimer = null;
let wsConnectingPromise = null;
const WS_RECONNECT_DELAY = 3000;

// ============= IP FILE PARSING =============
function parseIPFile() {
  try {
    if (!fs.existsSync(IP_FILE_PATH)) {
      return { valid: false, error: 'IP file not found', path: null, isServer: false };
    }

    const content = fs.readFileSync(IP_FILE_PATH, 'utf-8').trim();
    
    if (!content) {
      return { valid: false, error: 'IP file is empty. Configure database path.', path: null, isServer: false };
    }

    // Server mode - local path like C:\PayrollAO\payroll.db
    if (/^[A-Za-z]:\\.+$/.test(content)) {
      console.log('SERVER MODE: Local database path:', content);
      return { valid: true, path: content, isServer: true };
    }

    // Client mode - server name or IP (e.g., "SERVIDOR" or "10.0.0.10")
    const serverMatch = content.match(/^([A-Za-z0-9_\-\.]+)$/);
    if (serverMatch) {
      const server = serverMatch[1];
      console.log('CLIENT MODE: Will connect to server:', server);
      return { valid: true, path: null, isServer: false, serverAddress: server };
    }

    return { valid: false, error: 'Invalid format. Server: "C:\\path\\db.db", Client: "SERVERNAME"', path: null, isServer: false };
  } catch (error) {
    console.error('Error reading IP file:', error);
    return { valid: false, error: error.message, path: null, isServer: false };
  }
}

function checkDatabaseExists(dbFilePath) {
  try {
    return fs.existsSync(dbFilePath);
  } catch (error) {
    return false;
  }
}

// ============= ACTIVATION SYSTEM =============
function isAppActivated() {
  try {
    if (!fs.existsSync(ACTIVATED_FILE_PATH)) return false;
    return fs.readFileSync(ACTIVATED_FILE_PATH, 'utf-8').trim() === 'ACTIVATED';
  } catch (error) {
    return false;
  }
}

function activateApp() {
  try {
    fs.writeFileSync(ACTIVATED_FILE_PATH, 'ACTIVATED', 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============= WEBSOCKET SERVER (SERVER MODE) =============
function startWebSocketServer() {
  if (wss) {
    console.log('[WS] Server already running');
    return { success: true, port: WS_PORT };
  }

  try {
    wss = new WebSocketServer({ port: WS_PORT, host: '0.0.0.0' });
    
    console.log(`✅ WebSocket server running on port ${WS_PORT}`);

    wss.on('connection', (ws, req) => {
      const clientIP = req.socket.remoteAddress;
      console.log(`[WS] Client connected from ${clientIP}`);

      // Send initial data to newly connected client (TRUE PUSH on connect)
      const tables = ['employees', 'branches', 'deductions', 'payroll_periods', 'payroll_entries', 'holidays', 'absences', 'users', 'settings', 'documents'];
      for (const table of tables) {
        try {
          const rows = dbGetAll(table);
          ws.send(JSON.stringify({ type: 'db-sync', table, rows }));
          console.log(`[WS] → Sent initial ${table}: ${rows.length} rows to ${clientIP}`);
        } catch (e) {
          console.error(`[WS] Error sending initial ${table}:`, e);
        }
      }

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          console.log(`[WS] ← ${msg.action}(${msg.table || ''}) from ${clientIP}`);
          
          const response = handleDBRequest(msg);
          ws.send(JSON.stringify({ ...response, requestId: msg.requestId }));
        } catch (err) {
          console.error('[WS] Error handling message:', err);
          ws.send(JSON.stringify({ success: false, error: err.message }));
        }
      });

      ws.on('close', () => {
        console.log(`[WS] Client disconnected: ${clientIP}`);
      });

      ws.on('error', (err) => {
        console.log(`[WS] Client error: ${err.message}`);
      });
    });

    wss.on('error', (err) => {
      console.error('[WS] Server error:', err);
      wss = null;
    });

    return { success: true, port: WS_PORT };
  } catch (error) {
    console.error('[WS] Error starting server:', error);
    return { success: false, error: error.message };
  }
}

// Broadcast full table data to all clients (TRUE PUSH-BASED SYNC)
function broadcastTableData(table) {
  const rows = dbGetAll(table);
  const message = JSON.stringify({ type: 'db-sync', table, rows });
  
  console.log(`[WS] → Broadcasting ${table}: ${rows.length} rows to ${wss?.clients?.size || 0} clients + local`);
  
  // Send to all WebSocket clients
  if (wss) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Also notify local renderer with full data
  mainWindow?.webContents.send('payroll:sync', { table, rows });
}

// Legacy notification function (kept for 'all' table broadcast on import)
function broadcastUpdate(table, action, id) {
  if (table === 'all') {
    // Full import - broadcast all tables
    const tables = ['employees', 'branches', 'deductions', 'payroll_periods', 'payroll_entries', 'holidays', 'absences', 'users', 'settings', 'documents'];
    tables.forEach(t => broadcastTableData(t));
    return;
  }
  
  // Normal update - broadcast full table data
  broadcastTableData(table);
}

// ============= WEBSOCKET CLIENT (CLIENT MODE) =============
function connectToServer() {
  if (wsClient && (wsClient.readyState === WebSocket.OPEN || wsClient.readyState === WebSocket.CONNECTING)) {
    console.log('[WS] Already connected/connecting to server');
    return;
  }

  const url = `ws://${serverAddress}:${WS_PORT}`;
  console.log(`[WS] Connecting to server: ${url}`);

  try {
    wsClient = new WebSocket(url);

    wsClient.on('open', () => {
      console.log(`✅ Connected to payroll server: ${serverAddress}`);
      if (wsReconnectTimer) {
        clearTimeout(wsReconnectTimer);
        wsReconnectTimer = null;
      }

      // Tell renderer to refresh all tables now that we're connected (prevents "restart to see data")
      try {
        mainWindow?.webContents.send('payroll:updated', { table: 'all', action: 'connected' });
      } catch (e) {
        console.error('[WS] Failed to notify renderer about connection:', e);
      }
    });

    wsClient.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // Handle full data sync from server (TRUE PUSH)
        if (msg.type === 'db-sync') {
          console.log(`[WS] ← db-sync: ${msg.table} (${msg.rows?.length || 0} rows)`);
          mainWindow?.webContents.send('payroll:sync', { table: msg.table, rows: msg.rows });
          return;
        }

        // Legacy: handle old notification format (for backwards compatibility)
        if (msg.type === 'db-updated') {
          console.log(`[WS] ← db-updated (legacy): ${msg.table} ${msg.action}`);
          mainWindow?.webContents.send('payroll:updated', msg);
        }
      } catch (err) {
        console.error('[WS] Error parsing message:', err);
      }
    });

    wsClient.on('close', () => {
      console.log('[WS] ❌ Lost server connection');
      wsClient = null;
      scheduleReconnect();
    });

    wsClient.on('error', (err) => {
      console.error('[WS] Connection error:', err.message);
    });
  } catch (error) {
    console.error('[WS] Failed to connect:', error);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (wsReconnectTimer) return;

  console.log(`[WS] Reconnecting in ${WS_RECONNECT_DELAY / 1000}s...`);
  wsReconnectTimer = setTimeout(() => {
    wsReconnectTimer = null;
    if (!isServerMode && serverAddress) {
      connectToServer();
    }
  }, WS_RECONNECT_DELAY);
}

function ensureClientConnected(timeoutMs = 10000) {
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }

  if (!serverAddress) {
    return Promise.reject(new Error('Server address not configured'));
  }

  if (wsConnectingPromise) {
    return wsConnectingPromise;
  }

  // If we already have a socket that is CONNECTING, wait for it; otherwise create a new one.
  if (!wsClient || wsClient.readyState !== WebSocket.CONNECTING) {
    connectToServer();
  }

  const socket = wsClient;

  wsConnectingPromise = new Promise((resolve, reject) => {
    if (!socket) {
      wsConnectingPromise = null;
      reject(new Error('WebSocket not initialized'));
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Connection timeout'));
    }, timeoutMs);

    const onOpen = () => {
      console.log('[WS] ✅ ensureClientConnected: OPEN');
      cleanup();
      resolve();
    };

    const onClose = () => {
      console.log('[WS] ❌ ensureClientConnected: CLOSED');
      cleanup();
      reject(new Error('Connection closed'));
    };

    const onError = (err) => {
      console.log('[WS] ❌ ensureClientConnected: ERROR', err?.message);
      cleanup();
      reject(new Error(err?.message || 'Connection error'));
    };

    const cleanup = () => {
      clearTimeout(timer);
      try {
        socket.off('open', onOpen);
        socket.off('close', onClose);
        socket.off('error', onError);
      } catch (e) {}
      wsConnectingPromise = null;
    };

    if (socket.readyState === WebSocket.OPEN) {
      cleanup();
      resolve();
      return;
    }

    socket.on('open', onOpen);
    socket.on('close', onClose);
    socket.on('error', onError);
  });

  return wsConnectingPromise;
}

// Send request to server and wait for response
async function sendToServer(request) {
  await ensureClientConnected();

  return new Promise((resolve, reject) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) {
      reject(new Error('Not connected to server'));
      return;
    }

    const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 30000);

    const handler = (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.requestId === requestId) {
          clearTimeout(timeout);
          wsClient.off('message', handler);
          resolve(msg);
        }
      } catch (err) {
        // Ignore parse errors for broadcast messages
      }
    };

    wsClient.on('message', handler);
    wsClient.send(JSON.stringify({ ...request, requestId }));
  });
}

// ============= DATABASE REQUEST HANDLER (SERVER ONLY) =============
function handleDBRequest(request) {
  const { action, table, id, data, sql, params } = request;
  
  try {
    switch (action) {
      case 'ping':
        return { success: true, message: 'pong', isServer: true };
        
      case 'getAll':
        return { success: true, data: dbGetAll(table) };
        
      case 'getById':
        return { success: true, data: dbGetById(table, id) };
        
      case 'insert':
        return dbInsert(table, data);
        
      case 'update':
        return dbUpdate(table, id, data);
        
      case 'delete':
        return dbDelete(table, id);
        
      case 'query':
        const result = dbQuery(sql, params || []);
        if (Array.isArray(result)) {
          return { success: true, data: result };
        }
        return result;
        
      case 'export':
        return { success: true, data: dbExportAll() };
        
      case 'import':
        return dbImportAll(data);
        
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============= DATABASE OPERATIONS (SERVER ONLY) =============
function openDatabase(filePath) {
  try {
    const Database = require('better-sqlite3');
    const database = new Database(filePath, { timeout: 30000 });
    
    database.pragma('journal_mode = WAL');
    database.pragma('busy_timeout = 30000');
    database.pragma('synchronous = NORMAL');
    
    return database;
  } catch (error) {
    console.error('[DB] Error opening database:', error);
    throw error;
  }
}

function dbGetAll(table) {
  try {
    if (!db) return [];
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    console.log(`[DB] getAll(${table}): ${rows.length} rows`);
    return rows;
  } catch (error) {
    console.error(`[DB] Error getting all from ${table}:`, error);
    return [];
  }
}

function dbGetById(table, id) {
  try {
    if (!db) return null;
    return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  } catch (error) {
    console.error(`[DB] Error getting ${id} from ${table}:`, error);
    return null;
  }
}

function dbInsert(table, data) {
  try {
    if (!db) return { success: false, error: 'Database not connected' };
    
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`);
    const result = stmt.run(...values);
    
    db.pragma('wal_checkpoint(TRUNCATE)');
    
    console.log(`[DB] Inserted into ${table}, changes: ${result.changes}`);
    broadcastUpdate(table, 'insert', data.id);
    
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error(`[DB] Error inserting into ${table}:`, error);
    return { success: false, error: error.message };
  }
}

function dbUpdate(table, id, data) {
  try {
    if (!db) return { success: false, error: 'Database not connected' };
    
    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];
    
    const stmt = db.prepare(`UPDATE ${table} SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    const result = stmt.run(...values);
    
    db.pragma('wal_checkpoint(TRUNCATE)');
    
    console.log(`[DB] Updated ${table} id=${id}, changes: ${result.changes}`);
    broadcastUpdate(table, 'update', id);
    
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error(`[DB] Error updating ${table}:`, error);
    return { success: false, error: error.message };
  }
}

function dbDelete(table, id) {
  try {
    if (!db) return { success: false, error: 'Database not connected' };
    
    const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
    const result = stmt.run(id);
    
    db.pragma('wal_checkpoint(TRUNCATE)');
    
    console.log(`[DB] Deleted from ${table} id=${id}, changes: ${result.changes}`);
    broadcastUpdate(table, 'delete', id);
    
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error(`[DB] Error deleting from ${table}:`, error);
    return { success: false, error: error.message };
  }
}

function dbQuery(sql, params = []) {
  try {
    if (!db) return { success: false, error: 'Database not connected' };
    const stmt = db.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(...params);
    } else {
      return stmt.run(...params);
    }
  } catch (error) {
    console.error('[DB] Error executing query:', error);
    return { success: false, error: error.message };
  }
}

function dbExportAll() {
  try {
    if (!db) return null;
    return {
      employees: dbGetAll('employees'),
      branches: dbGetAll('branches'),
      deductions: dbGetAll('deductions'),
      payroll_periods: dbGetAll('payroll_periods'),
      payroll_entries: dbGetAll('payroll_entries'),
      holidays: dbGetAll('holidays'),
      absences: dbGetAll('absences'),
      users: dbGetAll('users'),
      settings: dbGetAll('settings'),
      documents: dbGetAll('documents'),
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[DB] Error exporting data:', error);
    return null;
  }
}

function dbImportAll(data) {
  try {
    if (!db) return { success: false, error: 'Database not connected' };
    
    const tables = [
      'employees', 'branches', 'deductions', 'payroll_periods',
      'payroll_entries', 'holidays', 'absences', 'users', 'settings', 'documents',
    ];

    db.exec('BEGIN TRANSACTION');

    for (const table of tables) {
      if (data[table] && Array.isArray(data[table])) {
        db.exec(`DELETE FROM ${table}`);
        for (const row of data[table]) {
          const keys = Object.keys(row);
          const values = Object.values(row);
          const placeholders = keys.map(() => '?').join(', ');
          db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`).run(...values);
        }
      }
    }

    db.exec('COMMIT');
    broadcastUpdate('all', 'import', null);
    return { success: true };
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch (e) {}
    console.error('[DB] Error importing data:', error);
    return { success: false, error: error.message };
  }
}

// ============= DATABASE INITIALIZATION =============
function initDatabase() {
  const ipConfig = parseIPFile();
  
  if (!ipConfig.valid) {
    console.log('IP file not configured:', ipConfig.error);
    return { success: false, error: ipConfig.error, needsConfig: true };
  }

  if (!ipConfig.isServer) {
    // Client mode - connect to server via WebSocket
    isServerMode = false;
    serverAddress = ipConfig.serverAddress;
    dbPath = null;
    console.log('CLIENT MODE: Will connect to', serverAddress);
    connectToServer();
    return { success: true, mode: 'client', serverAddress };
  }

  // Server mode - open local database and start WebSocket server
  dbPath = ipConfig.path;
  isServerMode = true;
  serverAddress = null;

  // Auto-create database if it doesn't exist (first run)
  if (!checkDatabaseExists(dbPath)) {
    console.log('Database not found at:', dbPath, '- Creating automatically...');
    const createResult = createNewDatabaseInternal(dbPath);
    if (!createResult.success) {
      return { 
        success: false, 
        error: `Erro ao criar base de dados: ${createResult.error}`, 
        needsDatabase: true 
      };
    }
    console.log('Database created successfully at:', dbPath);
  }

  try {
    if (db) {
      try { db.close(); } catch (e) {}
      db = null;
    }

    db = openDatabase(dbPath);
    runMigrations();
    startWebSocketServer();
    
    console.log('SERVER MODE: Connected to database at:', dbPath);
    return { success: true, mode: 'server', path: dbPath, wsPort: WS_PORT };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error: error.message };
  }
}

// Internal function to create database at a specific path (used for auto-creation)
function createNewDatabaseInternal(targetPath) {
  try {
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const Database = require('better-sqlite3');
    const newDb = new Database(targetPath);
    
    newDb.pragma('journal_mode = WAL');
    newDb.pragma('busy_timeout = 30000');
    newDb.pragma('synchronous = NORMAL');
    
    // Create all tables
    newDb.exec(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        employee_number TEXT,
        name TEXT NOT NULL,
        position TEXT,
        department TEXT,
        branch_id TEXT,
        hire_date TEXT,
        birth_date TEXT,
        contract_type TEXT DEFAULT 'permanent',
        contract_end_date TEXT,
        base_salary REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'bank_transfer',
        bank_name TEXT,
        bank_account TEXT,
        iban TEXT,
        nif TEXT,
        social_security TEXT,
        bi TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        emergency_contact TEXT,
        emergency_phone TEXT,
        nationality TEXT,
        gender TEXT,
        marital_status TEXT,
        photo TEXT,
        status TEXT DEFAULT 'active',
        notes TEXT,
        family_allowance REAL DEFAULT 0,
        monthly_bonus REAL DEFAULT 0,
        holiday_subsidy REAL DEFAULT 0,
        meal_allowance REAL DEFAULT 0,
        transport_allowance REAL DEFAULT 0,
        other_allowances REAL DEFAULT 0,
        is_retired INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT,
        province TEXT,
        city TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        manager_id TEXT,
        is_headquarters INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS deductions (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        amount REAL DEFAULT 0,
        date TEXT,
        payroll_period_id TEXT,
        is_applied INTEGER DEFAULT 0,
        installments INTEGER,
        current_installment INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS payroll_periods (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        type TEXT DEFAULT 'monthly',
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'draft',
        total_gross REAL DEFAULT 0,
        total_net REAL DEFAULT 0,
        total_deductions REAL DEFAULT 0,
        total_employer_costs REAL DEFAULT 0,
        processed_at TEXT,
        approved_at TEXT,
        paid_at TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS payroll_entries (
        id TEXT PRIMARY KEY,
        period_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        employee_name TEXT,
        employee_position TEXT,
        employee_department TEXT,
        branch_id TEXT,
        base_salary REAL DEFAULT 0,
        gross_salary REAL DEFAULT 0,
        net_salary REAL DEFAULT 0,
        irt REAL DEFAULT 0,
        inss_employee REAL DEFAULT 0,
        inss_employer REAL DEFAULT 0,
        total_deductions REAL DEFAULT 0,
        total_bonuses REAL DEFAULT 0,
        subsidy_alimentacao REAL DEFAULT 0,
        subsidy_transporte REAL DEFAULT 0,
        subsidy_ferias REAL DEFAULT 0,
        subsidy_natal REAL DEFAULT 0,
        overtime_hours REAL DEFAULT 0,
        overtime_amount REAL DEFAULT 0,
        absence_days INTEGER DEFAULT 0,
        absence_deduction REAL DEFAULT 0,
        other_deductions TEXT,
        other_bonuses TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS holidays (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        year INTEGER NOT NULL,
        days_used INTEGER DEFAULT 0,
        start_date TEXT,
        end_date TEXT,
        subsidy_paid INTEGER DEFAULT 0,
        subsidy_paid_month INTEGER,
        subsidy_paid_year INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'viewer',
        custom_permissions TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS absences (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        days INTEGER DEFAULT 1,
        reason TEXT,
        document_path TEXT,
        justified_at TEXT,
        justification_document TEXT,
        justification_notes TEXT,
        approved_by TEXT,
        approved_at TEXT,
        rejection_reason TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        employee_id TEXT,
        name TEXT NOT NULL,
        type TEXT,
        file_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO users (id, username, password, name, role, is_active) 
      VALUES ('admin-001', 'admin', 'admin', 'Administrador', 'admin', 1);
    `);

    newDb.close();
    console.log('New database created at:', targetPath);
    
    return { success: true, path: targetPath };
  } catch (error) {
    console.error('Error creating database:', error);
    return { success: false, error: error.message };
  }
}

// Public function to create database (validates IP file first)
function createNewDatabase() {
  try {
    const ipConfig = parseIPFile();
    
    if (!ipConfig.valid || !ipConfig.path) {
      return { success: false, error: 'Configure o ficheiro IP com o caminho da base de dados primeiro.' };
    }
    
    if (!ipConfig.isServer) {
      return { success: false, error: 'Clientes não podem criar base de dados. Crie no servidor primeiro.' };
    }
    
    const targetPath = ipConfig.path;

    if (fs.existsSync(targetPath)) {
      return { success: false, error: 'A base de dados já existe neste caminho.' };
    }

    return createNewDatabaseInternal(targetPath);
  } catch (error) {
    console.error('Error creating database:', error);
    return { success: false, error: error.message };
  }
}

function runMigrations() {
  if (!db) return;
  
  try {
    // Ensure core tables exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS branches (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS deductions (id TEXT PRIMARY KEY, type TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS payroll_periods (id TEXT PRIMARY KEY, year INTEGER NOT NULL, month INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS payroll_entries (id TEXT PRIMARY KEY, period_id TEXT NOT NULL, employee_id TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS holidays (id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, year INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS absences (id TEXT PRIMARY KEY, employee_id TEXT NOT NULL, type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    `);

    // Ensure default admin
    try {
      db.exec("INSERT OR IGNORE INTO users (id, username, password, name, role, is_active) VALUES ('admin-001', 'admin', 'admin', 'Administrador', 'admin', 1)");
    } catch (e) {}

    const addColumnIfMissing = (table, column, sql) => {
      try {
        const info = db.prepare(`PRAGMA table_info(${table})`).all();
        const columns = info.map(col => col.name);
        if (!columns.includes(column)) {
          db.exec(sql);
          console.log(`Migration: Added ${column} to ${table}`);
        }
      } catch (err) {}
    };
    
    // Employee columns
    addColumnIfMissing('employees', 'employee_number', "ALTER TABLE employees ADD COLUMN employee_number TEXT");
    addColumnIfMissing('employees', 'position', "ALTER TABLE employees ADD COLUMN position TEXT");
    addColumnIfMissing('employees', 'department', "ALTER TABLE employees ADD COLUMN department TEXT");
    addColumnIfMissing('employees', 'branch_id', "ALTER TABLE employees ADD COLUMN branch_id TEXT");
    addColumnIfMissing('employees', 'hire_date', "ALTER TABLE employees ADD COLUMN hire_date TEXT");
    addColumnIfMissing('employees', 'birth_date', "ALTER TABLE employees ADD COLUMN birth_date TEXT");
    addColumnIfMissing('employees', 'contract_type', "ALTER TABLE employees ADD COLUMN contract_type TEXT DEFAULT 'permanent'");
    addColumnIfMissing('employees', 'contract_end_date', "ALTER TABLE employees ADD COLUMN contract_end_date TEXT");
    addColumnIfMissing('employees', 'base_salary', "ALTER TABLE employees ADD COLUMN base_salary REAL DEFAULT 0");
    addColumnIfMissing('employees', 'payment_method', "ALTER TABLE employees ADD COLUMN payment_method TEXT DEFAULT 'bank_transfer'");
    addColumnIfMissing('employees', 'bank_name', "ALTER TABLE employees ADD COLUMN bank_name TEXT");
    addColumnIfMissing('employees', 'bank_account', "ALTER TABLE employees ADD COLUMN bank_account TEXT");
    addColumnIfMissing('employees', 'iban', "ALTER TABLE employees ADD COLUMN iban TEXT");
    addColumnIfMissing('employees', 'nif', "ALTER TABLE employees ADD COLUMN nif TEXT");
    addColumnIfMissing('employees', 'social_security', "ALTER TABLE employees ADD COLUMN social_security TEXT");
    addColumnIfMissing('employees', 'bi', "ALTER TABLE employees ADD COLUMN bi TEXT");
    addColumnIfMissing('employees', 'address', "ALTER TABLE employees ADD COLUMN address TEXT");
    addColumnIfMissing('employees', 'phone', "ALTER TABLE employees ADD COLUMN phone TEXT");
    addColumnIfMissing('employees', 'email', "ALTER TABLE employees ADD COLUMN email TEXT");
    addColumnIfMissing('employees', 'emergency_contact', "ALTER TABLE employees ADD COLUMN emergency_contact TEXT");
    addColumnIfMissing('employees', 'emergency_phone', "ALTER TABLE employees ADD COLUMN emergency_phone TEXT");
    addColumnIfMissing('employees', 'nationality', "ALTER TABLE employees ADD COLUMN nationality TEXT");
    addColumnIfMissing('employees', 'gender', "ALTER TABLE employees ADD COLUMN gender TEXT");
    addColumnIfMissing('employees', 'marital_status', "ALTER TABLE employees ADD COLUMN marital_status TEXT");
    addColumnIfMissing('employees', 'photo', "ALTER TABLE employees ADD COLUMN photo TEXT");
    addColumnIfMissing('employees', 'status', "ALTER TABLE employees ADD COLUMN status TEXT DEFAULT 'active'");
    addColumnIfMissing('employees', 'notes', "ALTER TABLE employees ADD COLUMN notes TEXT");
    addColumnIfMissing('employees', 'family_allowance', "ALTER TABLE employees ADD COLUMN family_allowance REAL DEFAULT 0");
    addColumnIfMissing('employees', 'monthly_bonus', "ALTER TABLE employees ADD COLUMN monthly_bonus REAL DEFAULT 0");
    addColumnIfMissing('employees', 'holiday_subsidy', "ALTER TABLE employees ADD COLUMN holiday_subsidy REAL DEFAULT 0");
    addColumnIfMissing('employees', 'meal_allowance', "ALTER TABLE employees ADD COLUMN meal_allowance REAL DEFAULT 0");
    addColumnIfMissing('employees', 'transport_allowance', "ALTER TABLE employees ADD COLUMN transport_allowance REAL DEFAULT 0");
    addColumnIfMissing('employees', 'other_allowances', "ALTER TABLE employees ADD COLUMN other_allowances REAL DEFAULT 0");
    addColumnIfMissing('employees', 'is_retired', "ALTER TABLE employees ADD COLUMN is_retired INTEGER DEFAULT 0");
    
    // Branch columns
    addColumnIfMissing('branches', 'code', "ALTER TABLE branches ADD COLUMN code TEXT");
    addColumnIfMissing('branches', 'province', "ALTER TABLE branches ADD COLUMN province TEXT");
    addColumnIfMissing('branches', 'city', "ALTER TABLE branches ADD COLUMN city TEXT");
    addColumnIfMissing('branches', 'address', "ALTER TABLE branches ADD COLUMN address TEXT");
    addColumnIfMissing('branches', 'phone', "ALTER TABLE branches ADD COLUMN phone TEXT");
    addColumnIfMissing('branches', 'email', "ALTER TABLE branches ADD COLUMN email TEXT");
    addColumnIfMissing('branches', 'manager_id', "ALTER TABLE branches ADD COLUMN manager_id TEXT");
    addColumnIfMissing('branches', 'is_headquarters', "ALTER TABLE branches ADD COLUMN is_headquarters INTEGER DEFAULT 0");
    addColumnIfMissing('branches', 'is_active', "ALTER TABLE branches ADD COLUMN is_active INTEGER DEFAULT 1");
    
    // Deduction columns
    addColumnIfMissing('deductions', 'employee_id', "ALTER TABLE deductions ADD COLUMN employee_id TEXT");
    addColumnIfMissing('deductions', 'description', "ALTER TABLE deductions ADD COLUMN description TEXT");
    addColumnIfMissing('deductions', 'amount', "ALTER TABLE deductions ADD COLUMN amount REAL DEFAULT 0");
    addColumnIfMissing('deductions', 'date', "ALTER TABLE deductions ADD COLUMN date TEXT");
    addColumnIfMissing('deductions', 'payroll_period_id', "ALTER TABLE deductions ADD COLUMN payroll_period_id TEXT");
    addColumnIfMissing('deductions', 'is_applied', "ALTER TABLE deductions ADD COLUMN is_applied INTEGER DEFAULT 0");
    addColumnIfMissing('deductions', 'installments', "ALTER TABLE deductions ADD COLUMN installments INTEGER");
    addColumnIfMissing('deductions', 'current_installment', "ALTER TABLE deductions ADD COLUMN current_installment INTEGER");
    
    // User columns
    addColumnIfMissing('users', 'name', "ALTER TABLE users ADD COLUMN name TEXT");
    addColumnIfMissing('users', 'role', "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'viewer'");
    addColumnIfMissing('users', 'is_active', "ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
    addColumnIfMissing('users', 'custom_permissions', "ALTER TABLE users ADD COLUMN custom_permissions TEXT");
    
    // Absence columns
    addColumnIfMissing('absences', 'status', "ALTER TABLE absences ADD COLUMN status TEXT DEFAULT 'pending'");
    addColumnIfMissing('absences', 'days', "ALTER TABLE absences ADD COLUMN days INTEGER DEFAULT 1");
    addColumnIfMissing('absences', 'reason', "ALTER TABLE absences ADD COLUMN reason TEXT");
    addColumnIfMissing('absences', 'document_path', "ALTER TABLE absences ADD COLUMN document_path TEXT");
    addColumnIfMissing('absences', 'justified_at', "ALTER TABLE absences ADD COLUMN justified_at TEXT");
    addColumnIfMissing('absences', 'justification_document', "ALTER TABLE absences ADD COLUMN justification_document TEXT");
    addColumnIfMissing('absences', 'justification_notes', "ALTER TABLE absences ADD COLUMN justification_notes TEXT");
    addColumnIfMissing('absences', 'approved_by', "ALTER TABLE absences ADD COLUMN approved_by TEXT");
    addColumnIfMissing('absences', 'approved_at', "ALTER TABLE absences ADD COLUMN approved_at TEXT");
    addColumnIfMissing('absences', 'rejection_reason', "ALTER TABLE absences ADD COLUMN rejection_reason TEXT");
    
    // Holiday columns
    addColumnIfMissing('holidays', 'days_used', "ALTER TABLE holidays ADD COLUMN days_used INTEGER DEFAULT 0");
    addColumnIfMissing('holidays', 'start_date', "ALTER TABLE holidays ADD COLUMN start_date TEXT");
    addColumnIfMissing('holidays', 'end_date', "ALTER TABLE holidays ADD COLUMN end_date TEXT");
    addColumnIfMissing('holidays', 'subsidy_paid', "ALTER TABLE holidays ADD COLUMN subsidy_paid INTEGER DEFAULT 0");
    addColumnIfMissing('holidays', 'subsidy_paid_month', "ALTER TABLE holidays ADD COLUMN subsidy_paid_month INTEGER");
    addColumnIfMissing('holidays', 'subsidy_paid_year', "ALTER TABLE holidays ADD COLUMN subsidy_paid_year INTEGER");
    
    // Payroll period columns
    addColumnIfMissing('payroll_periods', 'type', "ALTER TABLE payroll_periods ADD COLUMN type TEXT DEFAULT 'monthly'");
    addColumnIfMissing('payroll_periods', 'start_date', "ALTER TABLE payroll_periods ADD COLUMN start_date TEXT");
    addColumnIfMissing('payroll_periods', 'end_date', "ALTER TABLE payroll_periods ADD COLUMN end_date TEXT");
    addColumnIfMissing('payroll_periods', 'status', "ALTER TABLE payroll_periods ADD COLUMN status TEXT DEFAULT 'draft'");
    addColumnIfMissing('payroll_periods', 'total_gross', "ALTER TABLE payroll_periods ADD COLUMN total_gross REAL DEFAULT 0");
    addColumnIfMissing('payroll_periods', 'total_net', "ALTER TABLE payroll_periods ADD COLUMN total_net REAL DEFAULT 0");
    addColumnIfMissing('payroll_periods', 'total_deductions', "ALTER TABLE payroll_periods ADD COLUMN total_deductions REAL DEFAULT 0");
    addColumnIfMissing('payroll_periods', 'total_employer_costs', "ALTER TABLE payroll_periods ADD COLUMN total_employer_costs REAL DEFAULT 0");
    addColumnIfMissing('payroll_periods', 'processed_at', "ALTER TABLE payroll_periods ADD COLUMN processed_at TEXT");
    addColumnIfMissing('payroll_periods', 'approved_at', "ALTER TABLE payroll_periods ADD COLUMN approved_at TEXT");
    addColumnIfMissing('payroll_periods', 'paid_at', "ALTER TABLE payroll_periods ADD COLUMN paid_at TEXT");
    addColumnIfMissing('payroll_periods', 'notes', "ALTER TABLE payroll_periods ADD COLUMN notes TEXT");
    
    // Payroll entry columns
    addColumnIfMissing('payroll_entries', 'employee_name', "ALTER TABLE payroll_entries ADD COLUMN employee_name TEXT");
    addColumnIfMissing('payroll_entries', 'employee_position', "ALTER TABLE payroll_entries ADD COLUMN employee_position TEXT");
    addColumnIfMissing('payroll_entries', 'employee_department', "ALTER TABLE payroll_entries ADD COLUMN employee_department TEXT");
    addColumnIfMissing('payroll_entries', 'branch_id', "ALTER TABLE payroll_entries ADD COLUMN branch_id TEXT");

    addColumnIfMissing('payroll_entries', 'base_salary', "ALTER TABLE payroll_entries ADD COLUMN base_salary REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'gross_salary', "ALTER TABLE payroll_entries ADD COLUMN gross_salary REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'net_salary', "ALTER TABLE payroll_entries ADD COLUMN net_salary REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'irt', "ALTER TABLE payroll_entries ADD COLUMN irt REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'inss_employee', "ALTER TABLE payroll_entries ADD COLUMN inss_employee REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'inss_employer', "ALTER TABLE payroll_entries ADD COLUMN inss_employer REAL DEFAULT 0");

    addColumnIfMissing('payroll_entries', 'total_deductions', "ALTER TABLE payroll_entries ADD COLUMN total_deductions REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'total_bonuses', "ALTER TABLE payroll_entries ADD COLUMN total_bonuses REAL DEFAULT 0");

    addColumnIfMissing('payroll_entries', 'subsidy_alimentacao', "ALTER TABLE payroll_entries ADD COLUMN subsidy_alimentacao REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'subsidy_transporte', "ALTER TABLE payroll_entries ADD COLUMN subsidy_transporte REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'subsidy_ferias', "ALTER TABLE payroll_entries ADD COLUMN subsidy_ferias REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'subsidy_natal', "ALTER TABLE payroll_entries ADD COLUMN subsidy_natal REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'family_allowance', "ALTER TABLE payroll_entries ADD COLUMN family_allowance REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'monthly_bonus', "ALTER TABLE payroll_entries ADD COLUMN monthly_bonus REAL DEFAULT 0");

    // Overtime (legacy totals + detailed breakdown used by the app)
    addColumnIfMissing('payroll_entries', 'overtime_hours', "ALTER TABLE payroll_entries ADD COLUMN overtime_hours REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'overtime_amount', "ALTER TABLE payroll_entries ADD COLUMN overtime_amount REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'overtime_hours_normal', "ALTER TABLE payroll_entries ADD COLUMN overtime_hours_normal REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'overtime_hours_night', "ALTER TABLE payroll_entries ADD COLUMN overtime_hours_night REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'overtime_hours_holiday', "ALTER TABLE payroll_entries ADD COLUMN overtime_hours_holiday REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'overtime_normal', "ALTER TABLE payroll_entries ADD COLUMN overtime_normal REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'overtime_night', "ALTER TABLE payroll_entries ADD COLUMN overtime_night REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'overtime_holiday', "ALTER TABLE payroll_entries ADD COLUMN overtime_holiday REAL DEFAULT 0");

    addColumnIfMissing('payroll_entries', 'absence_days', "ALTER TABLE payroll_entries ADD COLUMN absence_days INTEGER DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'absence_deduction', "ALTER TABLE payroll_entries ADD COLUMN absence_deduction REAL DEFAULT 0");

    // Deductions breakdown used by the app
    addColumnIfMissing('payroll_entries', 'loan_deduction', "ALTER TABLE payroll_entries ADD COLUMN loan_deduction REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'advance_deduction', "ALTER TABLE payroll_entries ADD COLUMN advance_deduction REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'other_deductions_amount', "ALTER TABLE payroll_entries ADD COLUMN other_deductions_amount REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'deduction_details', "ALTER TABLE payroll_entries ADD COLUMN deduction_details TEXT");

    addColumnIfMissing('payroll_entries', 'total_employer_cost', "ALTER TABLE payroll_entries ADD COLUMN total_employer_cost REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'status', "ALTER TABLE payroll_entries ADD COLUMN status TEXT DEFAULT 'draft'");

    // Legacy/free-form fields (kept for backwards compatibility)
    addColumnIfMissing('payroll_entries', 'other_deductions', "ALTER TABLE payroll_entries ADD COLUMN other_deductions TEXT");
    addColumnIfMissing('payroll_entries', 'other_bonuses', "ALTER TABLE payroll_entries ADD COLUMN other_bonuses TEXT");
    addColumnIfMissing('payroll_entries', 'notes', "ALTER TABLE payroll_entries ADD COLUMN notes TEXT");
    
    // Document columns
    addColumnIfMissing('documents', 'employee_id', "ALTER TABLE documents ADD COLUMN employee_id TEXT");
    addColumnIfMissing('documents', 'type', "ALTER TABLE documents ADD COLUMN type TEXT");
    addColumnIfMissing('documents', 'file_path', "ALTER TABLE documents ADD COLUMN file_path TEXT");
    
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

// ============= UTILITY FUNCTIONS =============
function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  
  return addresses;
}

function readIPFile() {
  try {
    if (!fs.existsSync(IP_FILE_PATH)) {
      return { exists: false, content: '', path: IP_FILE_PATH };
    }
    const content = fs.readFileSync(IP_FILE_PATH, 'utf-8').trim();
    return { exists: true, content, path: IP_FILE_PATH };
  } catch (error) {
    return { exists: false, content: '', error: error.message, path: IP_FILE_PATH };
  }
}

function writeIPFile(content) {
  try {
    fs.writeFileSync(IP_FILE_PATH, content, 'utf-8');
    return { success: true, path: IP_FILE_PATH };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getDistPath() {
  if (app.isPackaged) {
    const possiblePaths = [
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(path.dirname(app.getPath('exe')), 'resources', 'app', 'dist', 'index.html'),
      path.join(__dirname, '..', 'dist', 'index.html'),
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }
    
    return path.join(app.getAppPath(), 'dist', 'index.html');
  }
  
  return path.join(__dirname, '..', 'dist', 'index.html');
}

// ============= WINDOW =============
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, '../public/pwa-512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    title: 'PayrollAO - Sistema de Folha Salarial',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = getDistPath();
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============= IPC HANDLERS =============
ipcMain.handle('app:relaunch', () => {
  try {
    app.relaunch();
    app.exit(0);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('activation:check', () => {
  return { isActivated: isAppActivated() };
});

ipcMain.handle('activation:activate', () => {
  return activateApp();
});

ipcMain.handle('ipfile:read', () => readIPFile());
ipcMain.handle('ipfile:write', (event, content) => writeIPFile(content));
ipcMain.handle('ipfile:parse', () => parseIPFile());

ipcMain.handle('db:getStatus', async () => {
  const ipConfig = parseIPFile();
  
  // Test connection for client mode
  let clientConnected = false;
  let clientError = null;
  
  if (!isServerMode && serverAddress && wsClient) {
    clientConnected = wsClient.readyState === WebSocket.OPEN;
    if (!clientConnected) {
      clientError = 'WebSocket not connected';
    }
  }
  
  return {
    configured: ipConfig.valid,
    path: isServerMode ? dbPath : null,
    isServer: isServerMode,
    isClient: !isServerMode && !!serverAddress,
    serverAddress: serverAddress,
    exists: isServerMode && dbPath ? checkDatabaseExists(dbPath) : null,
    connected: isServerMode ? (db !== null) : clientConnected,
    wsServerRunning: wss !== null,
    wsPort: WS_PORT,
    wsClients: wss ? wss.clients.size : 0,
    wsClientConnected: wsClient ? wsClient.readyState === WebSocket.OPEN : false,
    error: ipConfig.error || clientError,
  };
});

ipcMain.handle('db:create', () => createNewDatabase());
ipcMain.handle('db:init', () => initDatabase());

// Database operations - route via WebSocket if client mode
ipcMain.handle('db:getAll', async (event, table) => {
  if (!isServerMode && serverAddress) {
    try {
      console.log(`[Client] getAll(${table}) -> server`);
      const response = await sendToServer({ action: 'getAll', table });
      console.log(`[Client] getAll(${table}) <- ${(response.data || []).length} rows`);
      return response.data || [];
    } catch (err) {
      console.error(`[Client] getAll(${table}) FAILED:`, err.message);
      return [];
    }
  }
  return dbGetAll(table);
});

ipcMain.handle('db:getById', async (event, table, id) => {
  if (!isServerMode && serverAddress) {
    try {
      const response = await sendToServer({ action: 'getById', table, id });
      return response.data || null;
    } catch (err) {
      console.error(`[Client] getById FAILED:`, err.message);
      return null;
    }
  }
  return dbGetById(table, id);
});

ipcMain.handle('db:insert', async (event, table, data) => {
  if (!isServerMode && serverAddress) {
    try {
      console.log(`[Client] insert(${table}) -> server`);
      return await sendToServer({ action: 'insert', table, data });
    } catch (err) {
      console.error(`[Client] insert FAILED:`, err.message);
      return { success: false, error: err.message };
    }
  }
  return dbInsert(table, data);
});

ipcMain.handle('db:update', async (event, table, id, data) => {
  if (!isServerMode && serverAddress) {
    try {
      console.log(`[Client] update(${table}, ${id}) -> server`);
      return await sendToServer({ action: 'update', table, id, data });
    } catch (err) {
      console.error(`[Client] update FAILED:`, err.message);
      return { success: false, error: err.message };
    }
  }
  return dbUpdate(table, id, data);
});

ipcMain.handle('db:delete', async (event, table, id) => {
  if (!isServerMode && serverAddress) {
    try {
      console.log(`[Client] delete(${table}, ${id}) -> server`);
      return await sendToServer({ action: 'delete', table, id });
    } catch (err) {
      console.error(`[Client] delete FAILED:`, err.message);
      return { success: false, error: err.message };
    }
  }
  return dbDelete(table, id);
});

ipcMain.handle('db:query', async (event, sql, params) => {
  if (!isServerMode && serverAddress) {
    try {
      const response = await sendToServer({ action: 'query', sql, params });
      return response.data || [];
    } catch (err) {
      console.error(`[Client] query FAILED:`, err.message);
      return [];
    }
  }
  return dbQuery(sql, params);
});

ipcMain.handle('db:export', async () => {
  if (!isServerMode && serverAddress) {
    try {
      const response = await sendToServer({ action: 'export' });
      return response.data;
    } catch (err) {
      return null;
    }
  }
  return dbExportAll();
});

ipcMain.handle('db:import', async (event, data) => {
  if (!isServerMode && serverAddress) {
    try {
      return await sendToServer({ action: 'import', data });
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return dbImportAll(data);
});

ipcMain.handle('db:testConnection', async () => {
  if (!isServerMode && serverAddress) {
    try {
      const response = await sendToServer({ action: 'ping' });
      return { success: response.success === true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: db !== null };
});

// ============= PRINTING (ELECTRON) =============
// Chromium print preview is often disabled in Electron; use webContents.print.
ipcMain.handle('print:html', async (event, html, options = {}) => {
  return await new Promise((resolve) => {
    let printWin = null;

    try {
      printWin = new BrowserWindow({
        // If we're showing a system print dialog (silent=false), the window must be visible
        // on some OS/drivers otherwise the dialog may not appear / list printers.
        show: options?.silent ? false : true,
        width: 1000,
        height: 800,
        parent: mainWindow || undefined,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(String(html || ''));

       printWin.webContents.once('did-finish-load', async () => {
         const printOptions = {
           silent: !!options.silent,
           printBackground: options.printBackground !== false,
         };

         try {
           // Wait for images to load/resolve inside the print window (prevents blank preview)
           await printWin.webContents.executeJavaScript(`
             (async () => {
               try { await document.fonts?.ready; } catch (e) {}
               const imgs = Array.from(document.images || []);
               await Promise.all(imgs.map(img => {
                 if (img.complete) return Promise.resolve();
                 return new Promise(res => { img.onload = res; img.onerror = res; });
               }));
               return true;
             })();
           `);
         } catch (e) {}

         try {
           if (!printOptions.silent) {
             // Ensure print dialog appears on top
             printWin.show();
             printWin.focus();
           }
         } catch (e) {}

         // Small delay for rendering stability
         setTimeout(() => {
           printWin.webContents.print(printOptions, (success, failureReason) => {
             try { printWin.close(); } catch (e) {}
             resolve({ success: !!success, error: success ? null : (failureReason || 'Print failed') });
           });
         }, 250);
       });

      printWin.webContents.once('did-fail-load', (e, errorCode, errorDescription) => {
        try { printWin.close(); } catch (err) {}
        resolve({ success: false, error: `${errorCode}: ${errorDescription}` });
      });

      printWin.loadURL(dataUrl);
    } catch (err) {
      try { printWin?.close(); } catch (e) {}
      resolve({ success: false, error: err.message || String(err) });
    }
  });
});

ipcMain.handle('network:getLocalIPs', () => getLocalIPAddresses());
ipcMain.handle('network:getInstallPath', () => INSTALL_DIR);
ipcMain.handle('network:getIPFilePath', () => IP_FILE_PATH);
ipcMain.handle('network:getComputerName', () => os.hostname());

// ============= APP LIFECYCLE =============
app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Cleanup
  if (db) {
    try { db.close(); } catch (e) {}
    db = null;
  }
  if (wss) {
    try { wss.close(); } catch (e) {}
    wss = null;
  }
  if (wsClient) {
    try { wsClient.close(); } catch (e) {}
    wsClient = null;
  }
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
    wsReconnectTimer = null;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
