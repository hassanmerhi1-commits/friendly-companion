const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');

// ============= PATHS AND CONFIGURATION =============
const INSTALL_DIR = 'C:\\PayrollAO';
const IP_FILE_PATH = path.join(INSTALL_DIR, 'IP');
const ACTIVATED_FILE_PATH = path.join(INSTALL_DIR, 'activated.txt');
const PIPE_NAME = 'PayrollAO-DB';

// Ensure install directory exists
if (!fs.existsSync(INSTALL_DIR)) {
  try {
    fs.mkdirSync(INSTALL_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create install directory:', err);
  }
}

// Create empty IP file if it doesn't exist
if (!fs.existsSync(IP_FILE_PATH)) {
  try {
    fs.writeFileSync(IP_FILE_PATH, '', 'utf-8');
    console.log('Created empty IP file at:', IP_FILE_PATH);
  } catch (err) {
    console.error('Failed to create IP file:', err);
  }
}

let mainWindow;
let db = null;
let dbPath = null;
let isClientMode = false;
let serverName = null;
let pipeServer = null;

// ============= IP FILE PARSING =============
// Format: 
//   Server: C:\PayrollAO\payroll.db (local path - runs named pipe service)
//   Client: \\SERVERNAME\pipe\PayrollAO-DB (or just SERVERNAME to use default pipe name)
//   Simple: SERVERNAME (connects to \\SERVERNAME\pipe\PayrollAO-DB)

function parseIPFile() {
  try {
    if (!fs.existsSync(IP_FILE_PATH)) {
      return { valid: false, error: 'IP file not found', path: null, isClient: false };
    }

    const content = fs.readFileSync(IP_FILE_PATH, 'utf-8').trim();
    
    if (!content) {
      return { valid: false, error: 'IP file is empty. Configure database path.', path: null, isClient: false };
    }

    // Server mode - local path like C:\PayrollAO\payroll.db
    if (/^[A-Za-z]:\\.+$/.test(content)) {
      console.log('SERVER MODE: Local database path:', content);
      return { valid: true, path: content, isClient: false };
    }

    // Client mode - just server name or IP (e.g., "SERVIDOR" or "10.0.0.10")
    // Will connect to \\SERVERNAME\pipe\PayrollAO-DB
    const serverMatch = content.match(/^([A-Za-z0-9_\-\.]+)$/);
    if (serverMatch) {
      const server = serverMatch[1];
      console.log('CLIENT MODE: Will connect to server', server);
      return { valid: true, path: null, isClient: true, serverName: server };
    }

    return { valid: false, error: 'Invalid format. Server: "C:\\path\\db.db", Client: "SERVERNAME"', path: null, isClient: false };
  } catch (error) {
    console.error('Error reading IP file:', error);
    return { valid: false, error: error.message, path: null, isClient: false };
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

// ============= DATABASE CREATION (SERVER ONLY - MANUAL ACTION) =============
// Database is NEVER auto-created. Must be explicitly created via db:create command.

function createNewDatabase() {
  try {
    const ipConfig = parseIPFile();
    
    if (!ipConfig.valid || !ipConfig.path) {
      return { success: false, error: 'Configure o ficheiro IP com o caminho da base de dados primeiro.' };
    }
    
    if (ipConfig.isClient) {
      return { success: false, error: 'Clientes não podem criar base de dados. Crie no servidor primeiro.' };
    }
    
    const targetPath = ipConfig.path;

    if (fs.existsSync(targetPath)) {
      return { success: false, error: 'A base de dados já existe neste caminho.' };
    }

    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const Database = require('better-sqlite3');
    const newDb = new Database(targetPath);
    
    newDb.pragma('journal_mode = WAL');
    newDb.pragma('busy_timeout = 30000');
    newDb.pragma('synchronous = NORMAL');
    
    // Create ALL tables - EMPTY database schema
    newDb.exec(`
      -- EMPLOYEES TABLE
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
      
      -- BRANCHES TABLE
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
      
      -- DEDUCTIONS TABLE
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
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );
      
      -- PAYROLL PERIODS TABLE
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
      
      -- PAYROLL ENTRIES TABLE
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
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES payroll_periods(id),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );
      
      -- HOLIDAYS TABLE
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
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );
      
      -- USERS TABLE
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
      
      -- ABSENCES TABLE
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
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );
      
      -- SETTINGS TABLE
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- DOCUMENTS TABLE
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        employee_id TEXT,
        name TEXT NOT NULL,
        type TEXT,
        file_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );

      -- DEFAULT ADMIN USER ONLY
      INSERT INTO users (id, username, password, name, role, is_active) 
      VALUES ('admin-001', 'admin', 'admin', 'Administrador', 'admin', 1);
    `);

    newDb.close();
    console.log('New EMPTY database created at:', targetPath);
    
    return { success: true, path: targetPath };
  } catch (error) {
    console.error('Error creating database:', error);
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

// ============= NAMED PIPE SERVER (runs on SERVER PC) =============

function getLocalPipePath() {
  return `\\\\.\\pipe\\${PIPE_NAME}`;
}

function getRemotePipePath(server) {
  return `\\\\${server}\\pipe\\${PIPE_NAME}`;
}

function startNamedPipeServer() {
  if (pipeServer) {
    console.log('Named pipe server already running');
    return { success: true };
  }

  const pipePath = getLocalPipePath();
  
  pipeServer = net.createServer((socket) => {
    console.log('Client connected via named pipe');
    
    let buffer = '';
    
    socket.on('data', (data) => {
      buffer += data.toString();
      
      // Process complete messages (newline delimited JSON)
      const messages = buffer.split('\n');
      buffer = messages.pop() || '';
      
      for (const msg of messages) {
        if (!msg.trim()) continue;
        
        try {
          const request = JSON.parse(msg);
          const response = handleDBRequest(request);
          socket.write(JSON.stringify(response) + '\n');
        } catch (err) {
          console.error('Error processing request:', err);
          socket.write(JSON.stringify({ success: false, error: err.message }) + '\n');
        }
      }
    });
    
    socket.on('error', (err) => {
      console.log('Client socket error:', err.message);
    });
    
    socket.on('close', () => {
      console.log('Client disconnected');
    });
  });

  pipeServer.on('error', (err) => {
    console.error('Named pipe server error:', err);
    pipeServer = null;
  });

  pipeServer.listen(pipePath, () => {
    console.log(`Named pipe server listening on: ${pipePath}`);
  });

  return { success: true, pipePath };
}

function handleDBRequest(request) {
  const { action, table, id, data, sql, params } = request;
  
  try {
    switch (action) {
      case 'ping':
        return { success: true, message: 'pong' };
        
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

// ============= NAMED PIPE CLIENT (runs on CLIENT PCs) =============

function sendToPipeServer(request) {
  return new Promise((resolve, reject) => {
    if (!serverName) {
      reject(new Error('Server not configured'));
      return;
    }

    const pipePath = getRemotePipePath(serverName);
    const client = net.createConnection(pipePath, () => {
      client.write(JSON.stringify(request) + '\n');
    });

    let buffer = '';
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.destroy();
        reject(new Error('Connection timeout'));
      }
    }, 30000);

    client.on('data', (data) => {
      buffer += data.toString();
      
      const messages = buffer.split('\n');
      buffer = messages.pop() || '';
      
      for (const msg of messages) {
        if (msg.trim() && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          client.destroy();
          try {
            resolve(JSON.parse(msg));
          } catch (err) {
            reject(new Error('Invalid response from server'));
          }
        }
      }
    });

    client.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    client.on('close', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error('Connection closed'));
      }
    });
  });
}

// ============= SQLite DATABASE (SERVER ONLY) =============

function openDatabase(filePath) {
  try {
    const Database = require('better-sqlite3');
    const database = new Database(filePath, {
      timeout: 30000,
    });
    
    database.pragma('journal_mode = WAL');
    database.pragma('busy_timeout = 30000');
    database.pragma('synchronous = NORMAL');
    
    return database;
  } catch (error) {
    console.error('[DB] Error opening database:', error);
    throw error;
  }
}

function initDatabase() {
  const ipConfig = parseIPFile();
  
  if (!ipConfig.valid) {
    console.log('IP file not configured:', ipConfig.error);
    return { success: false, error: ipConfig.error, needsConfig: true };
  }

  if (ipConfig.isClient) {
    // Client mode - don't open local DB, connect via named pipe to server
    isClientMode = true;
    serverName = ipConfig.serverName;
    dbPath = null;
    console.log('CLIENT MODE: Will connect to server', serverName, 'via named pipe');
    // Don't auto-connect, just set the mode
    return { success: true, mode: 'client', serverName };
  }

  // Server mode - open EXISTING local database and start named pipe server
  // Database must already exist - we never auto-create it
  dbPath = ipConfig.path;
  isClientMode = false;
  serverName = null;

  if (!checkDatabaseExists(dbPath)) {
    console.log('Database not found at:', dbPath);
    return { 
      success: false, 
      error: `Base de dados não encontrada: ${dbPath}. Use "Criar Base de Dados" primeiro.`, 
      needsDatabase: true 
    };
  }

  try {
    if (db) {
      try { db.close(); } catch (e) {}
      db = null;
    }

    // Open existing database - never create new one here
    db = openDatabase(dbPath);
    runMigrations();
    
    // Start named pipe server for client connections
    startNamedPipeServer();
    
    console.log('SERVER MODE: Connected to existing database at:', dbPath);
    return { success: true, mode: 'server', path: dbPath };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error: error.message };
  }
}

function runMigrations() {
  if (!db) return;
  
  try {
    const addColumnIfMissing = (table, column, sql) => {
      try {
        const info = db.prepare(`PRAGMA table_info(${table})`).all();
        const columns = info.map(col => col.name);
        if (!columns.includes(column)) {
          db.exec(sql);
          console.log(`Migration: Added ${column} to ${table}`);
        }
      } catch (err) {
        console.error(`Migration error:`, err.message);
      }
    };
    
    // Employee migrations
    addColumnIfMissing('employees', 'employee_number', "ALTER TABLE employees ADD COLUMN employee_number TEXT");
    addColumnIfMissing('employees', 'contract_type', "ALTER TABLE employees ADD COLUMN contract_type TEXT DEFAULT 'permanent'");
    addColumnIfMissing('employees', 'contract_end_date', "ALTER TABLE employees ADD COLUMN contract_end_date TEXT");
    addColumnIfMissing('employees', 'base_salary', "ALTER TABLE employees ADD COLUMN base_salary REAL DEFAULT 0");
    addColumnIfMissing('employees', 'payment_method', "ALTER TABLE employees ADD COLUMN payment_method TEXT DEFAULT 'bank_transfer'");
    addColumnIfMissing('employees', 'nationality', "ALTER TABLE employees ADD COLUMN nationality TEXT");
    addColumnIfMissing('employees', 'gender', "ALTER TABLE employees ADD COLUMN gender TEXT");
    addColumnIfMissing('employees', 'marital_status', "ALTER TABLE employees ADD COLUMN marital_status TEXT");
    addColumnIfMissing('employees', 'photo', "ALTER TABLE employees ADD COLUMN photo TEXT");
    addColumnIfMissing('employees', 'family_allowance', "ALTER TABLE employees ADD COLUMN family_allowance REAL DEFAULT 0");
    addColumnIfMissing('employees', 'monthly_bonus', "ALTER TABLE employees ADD COLUMN monthly_bonus REAL DEFAULT 0");
    addColumnIfMissing('employees', 'holiday_subsidy', "ALTER TABLE employees ADD COLUMN holiday_subsidy REAL DEFAULT 0");
    addColumnIfMissing('employees', 'bi', "ALTER TABLE employees ADD COLUMN bi TEXT");
    addColumnIfMissing('employees', 'meal_allowance', "ALTER TABLE employees ADD COLUMN meal_allowance REAL DEFAULT 0");
    addColumnIfMissing('employees', 'transport_allowance', "ALTER TABLE employees ADD COLUMN transport_allowance REAL DEFAULT 0");
    addColumnIfMissing('employees', 'other_allowances', "ALTER TABLE employees ADD COLUMN other_allowances REAL DEFAULT 0");
    addColumnIfMissing('employees', 'is_retired', "ALTER TABLE employees ADD COLUMN is_retired INTEGER DEFAULT 0");
    
    // Branch migrations
    addColumnIfMissing('branches', 'code', "ALTER TABLE branches ADD COLUMN code TEXT");
    addColumnIfMissing('branches', 'province', "ALTER TABLE branches ADD COLUMN province TEXT");
    addColumnIfMissing('branches', 'city', "ALTER TABLE branches ADD COLUMN city TEXT");
    addColumnIfMissing('branches', 'email', "ALTER TABLE branches ADD COLUMN email TEXT");
    addColumnIfMissing('branches', 'manager_id', "ALTER TABLE branches ADD COLUMN manager_id TEXT");
    addColumnIfMissing('branches', 'is_headquarters', "ALTER TABLE branches ADD COLUMN is_headquarters INTEGER DEFAULT 0");
    addColumnIfMissing('branches', 'is_active', "ALTER TABLE branches ADD COLUMN is_active INTEGER DEFAULT 1");
    
    // Deduction migrations
    addColumnIfMissing('deductions', 'employee_id', "ALTER TABLE deductions ADD COLUMN employee_id TEXT");
    addColumnIfMissing('deductions', 'amount', "ALTER TABLE deductions ADD COLUMN amount REAL DEFAULT 0");
    addColumnIfMissing('deductions', 'date', "ALTER TABLE deductions ADD COLUMN date TEXT");
    addColumnIfMissing('deductions', 'payroll_period_id', "ALTER TABLE deductions ADD COLUMN payroll_period_id TEXT");
    addColumnIfMissing('deductions', 'is_applied', "ALTER TABLE deductions ADD COLUMN is_applied INTEGER DEFAULT 0");
    addColumnIfMissing('deductions', 'installments', "ALTER TABLE deductions ADD COLUMN installments INTEGER");
    addColumnIfMissing('deductions', 'current_installment', "ALTER TABLE deductions ADD COLUMN current_installment INTEGER");
    
    // User migrations
    addColumnIfMissing('users', 'is_active', "ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
    addColumnIfMissing('users', 'custom_permissions', "ALTER TABLE users ADD COLUMN custom_permissions TEXT");
    
    // Absence migrations
    addColumnIfMissing('absences', 'document_path', "ALTER TABLE absences ADD COLUMN document_path TEXT");
    addColumnIfMissing('absences', 'justified_at', "ALTER TABLE absences ADD COLUMN justified_at TEXT");
    addColumnIfMissing('absences', 'justification_document', "ALTER TABLE absences ADD COLUMN justification_document TEXT");
    addColumnIfMissing('absences', 'justification_notes', "ALTER TABLE absences ADD COLUMN justification_notes TEXT");
    addColumnIfMissing('absences', 'approved_by', "ALTER TABLE absences ADD COLUMN approved_by TEXT");
    addColumnIfMissing('absences', 'approved_at', "ALTER TABLE absences ADD COLUMN approved_at TEXT");
    addColumnIfMissing('absences', 'rejection_reason', "ALTER TABLE absences ADD COLUMN rejection_reason TEXT");
    
    // Holiday migrations
    addColumnIfMissing('holidays', 'employee_id', "ALTER TABLE holidays ADD COLUMN employee_id TEXT");
    addColumnIfMissing('holidays', 'year', "ALTER TABLE holidays ADD COLUMN year INTEGER");
    addColumnIfMissing('holidays', 'days_used', "ALTER TABLE holidays ADD COLUMN days_used INTEGER DEFAULT 0");
    addColumnIfMissing('holidays', 'start_date', "ALTER TABLE holidays ADD COLUMN start_date TEXT");
    addColumnIfMissing('holidays', 'end_date', "ALTER TABLE holidays ADD COLUMN end_date TEXT");
    addColumnIfMissing('holidays', 'subsidy_paid', "ALTER TABLE holidays ADD COLUMN subsidy_paid INTEGER DEFAULT 0");
    addColumnIfMissing('holidays', 'subsidy_paid_month', "ALTER TABLE holidays ADD COLUMN subsidy_paid_month INTEGER");
    addColumnIfMissing('holidays', 'subsidy_paid_year', "ALTER TABLE holidays ADD COLUMN subsidy_paid_year INTEGER");
    
    // Payroll entry migrations
    addColumnIfMissing('payroll_entries', 'subsidy_alimentacao', "ALTER TABLE payroll_entries ADD COLUMN subsidy_alimentacao REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'subsidy_transporte', "ALTER TABLE payroll_entries ADD COLUMN subsidy_transporte REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'subsidy_ferias', "ALTER TABLE payroll_entries ADD COLUMN subsidy_ferias REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'subsidy_natal', "ALTER TABLE payroll_entries ADD COLUMN subsidy_natal REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'overtime_hours', "ALTER TABLE payroll_entries ADD COLUMN overtime_hours REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'overtime_amount', "ALTER TABLE payroll_entries ADD COLUMN overtime_amount REAL DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'absence_days', "ALTER TABLE payroll_entries ADD COLUMN absence_days INTEGER DEFAULT 0");
    addColumnIfMissing('payroll_entries', 'absence_deduction', "ALTER TABLE payroll_entries ADD COLUMN absence_deduction REAL DEFAULT 0");
    
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

// ============= DATABASE OPERATIONS =============

function dbGetAll(table) {
  try {
    if (!db) {
      console.log(`[DB] dbGetAll(${table}): Database not connected`);
      return [];
    }
    const stmt = db.prepare(`SELECT * FROM ${table}`);
    const rows = stmt.all();
    console.log(`[DB] dbGetAll(${table}): Found ${rows.length} rows`);
    return rows;
  } catch (error) {
    console.error(`Error getting all from ${table}:`, error);
    return [];
  }
}

function dbGetById(table, id) {
  try {
    if (!db) return null;
    const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    return stmt.get(id);
  } catch (error) {
    console.error(`Error getting ${id} from ${table}:`, error);
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
    
    // Force checkpoint to update file modification time
    db.pragma('wal_checkpoint(TRUNCATE)');
    
    console.log(`[DB] Inserted into ${table}, changes: ${result.changes}`);
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error(`Error inserting into ${table}:`, error);
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
    
    // Force checkpoint to update file modification time
    db.pragma('wal_checkpoint(TRUNCATE)');
    
    console.log(`[DB] Updated ${table} id=${id}, changes: ${result.changes}`);
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error(`Error updating ${table}:`, error);
    return { success: false, error: error.message };
  }
}

function dbDelete(table, id) {
  try {
    if (!db) return { success: false, error: 'Database not connected' };
    const stmt = db.prepare(`DELETE FROM ${table} WHERE id = ?`);
    const result = stmt.run(id);
    
    // Force checkpoint to update file modification time
    db.pragma('wal_checkpoint(TRUNCATE)');
    
    console.log(`[DB] Deleted from ${table} id=${id}, changes: ${result.changes}`);
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error(`Error deleting from ${table}:`, error);
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
    console.error('Error executing query:', error);
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
    console.error('Error exporting data:', error);
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
          dbInsert(table, row);
        }
      }
    }

    db.exec('COMMIT');
    return { success: true };
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch (e) {}
    console.error('Error importing data:', error);
    return { success: false, error: error.message };
  }
}

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

ipcMain.handle('ipfile:read', () => {
  return readIPFile();
});

ipcMain.handle('ipfile:write', (event, content) => {
  return writeIPFile(content);
});

ipcMain.handle('ipfile:parse', () => {
  return parseIPFile();
});

ipcMain.handle('db:getStatus', () => {
  const ipConfig = parseIPFile();
  return {
    configured: ipConfig.valid,
    path: ipConfig.path,
    isClient: ipConfig.isClient,
    serverName: ipConfig.serverName || serverName || null,
    exists: ipConfig.valid && !ipConfig.isClient ? checkDatabaseExists(ipConfig.path) : null,
    connected: isClientMode ? (serverName !== null) : (db !== null),
    pipeServerRunning: pipeServer !== null,
    pipeName: PIPE_NAME,
    error: ipConfig.error,
  };
});

ipcMain.handle('db:create', () => {
  return createNewDatabase();
});

ipcMain.handle('db:init', () => {
  return initDatabase();
});

// Database operations - route to server via named pipe if client mode
ipcMain.handle('db:getAll', async (event, table) => {
  if (isClientMode) {
    try {
      const response = await sendToPipeServer({ action: 'getAll', table });
      return response.data || [];
    } catch (err) {
      console.error('Client getAll error:', err);
      return [];
    }
  }
  return dbGetAll(table);
});

ipcMain.handle('db:getById', async (event, table, id) => {
  if (isClientMode) {
    try {
      const response = await sendToPipeServer({ action: 'getById', table, id });
      return response.data || null;
    } catch (err) {
      console.error('Client getById error:', err);
      return null;
    }
  }
  return dbGetById(table, id);
});

ipcMain.handle('db:insert', async (event, table, data) => {
  if (isClientMode) {
    try {
      return await sendToPipeServer({ action: 'insert', table, data });
    } catch (err) {
      console.error('Client insert error:', err);
      return { success: false, error: err.message };
    }
  }
  return dbInsert(table, data);
});

ipcMain.handle('db:update', async (event, table, id, data) => {
  if (isClientMode) {
    try {
      return await sendToPipeServer({ action: 'update', table, id, data });
    } catch (err) {
      console.error('Client update error:', err);
      return { success: false, error: err.message };
    }
  }
  return dbUpdate(table, id, data);
});

ipcMain.handle('db:delete', async (event, table, id) => {
  if (isClientMode) {
    try {
      return await sendToPipeServer({ action: 'delete', table, id });
    } catch (err) {
      console.error('Client delete error:', err);
      return { success: false, error: err.message };
    }
  }
  return dbDelete(table, id);
});

ipcMain.handle('db:query', async (event, sql, params) => {
  if (isClientMode) {
    try {
      const response = await sendToPipeServer({ action: 'query', sql, params });
      return response.data || [];
    } catch (err) {
      console.error('Client query error:', err);
      return [];
    }
  }
  return dbQuery(sql, params);
});

ipcMain.handle('db:export', async () => {
  if (isClientMode) {
    try {
      const response = await sendToPipeServer({ action: 'export' });
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Client export error:', err);
      return { success: false, error: err.message };
    }
  }
  const data = dbExportAll();
  if (data) {
    return { success: true, data };
  }
  return { success: false, error: 'Failed to export data' };
});

ipcMain.handle('db:import', async (event, data) => {
  if (isClientMode) {
    try {
      return await sendToPipeServer({ action: 'import', data });
    } catch (err) {
      console.error('Client import error:', err);
      return { success: false, error: err.message };
    }
  }
  return dbImportAll(data);
});

ipcMain.handle('db:testConnection', async () => {
  try {
    if (isClientMode) {
      const response = await sendToPipeServer({ action: 'ping' });
      return { success: response.success, message: response.message };
    }
    
    if (!db) {
      return { success: false, error: 'Database not initialized' };
    }
    const result = db.prepare('SELECT 1 as test').get();
    return { success: result?.test === 1 };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('network:getLocalIPs', () => {
  return getLocalIPAddresses();
});

ipcMain.handle('network:getInstallPath', () => {
  return INSTALL_DIR;
});

ipcMain.handle('network:getIPFilePath', () => {
  return IP_FILE_PATH;
});

ipcMain.handle('network:getComputerName', () => {
  return os.hostname();
});

// ============= APP LIFECYCLE =============

app.whenReady().then(() => {
  createWindow();
  
  // Auto-initialize database on startup if configured
  const initResult = initDatabase();
  if (initResult.success) {
    console.log('Database auto-initialized:', initResult.mode, initResult.path || initResult.serverName);
  } else if (initResult.needsConfig || initResult.needsDatabase) {
    console.log('Database needs configuration:', initResult.error);
  } else {
    console.log('Database init skipped:', initResult.error);
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (pipeServer) {
    try { pipeServer.close(); } catch (e) {}
  }
  if (db) {
    try { db.close(); } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
