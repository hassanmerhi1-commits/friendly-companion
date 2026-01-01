const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ============= PATHS AND CONFIGURATION =============
const INSTALL_DIR = 'C:\\PayrollAO';
const IP_FILE_PATH = path.join(INSTALL_DIR, 'IP');
const ACTIVATED_FILE_PATH = path.join(INSTALL_DIR, 'activated.txt');

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
let serverIP = null;

// ============= IP FILE PARSING =============
// Format: 
//   Server: C:\PayrollAO\payroll.db (local path)
//   Client: \\10.0.0.10\PayrollAO\payroll.db (UNC path to shared folder)

function parseIPFile() {
  try {
    if (!fs.existsSync(IP_FILE_PATH)) {
      return { valid: false, error: 'IP file not found', path: null, isClient: false };
    }

    const content = fs.readFileSync(IP_FILE_PATH, 'utf-8').trim();
    
    if (!content) {
      return { valid: false, error: 'IP file is empty. Configure database path.', path: null, isClient: false };
    }

    // Check if it's UNC path (client mode) - format: \\SERVER\share\path\db.db
    if (content.startsWith('\\\\')) {
      const match = content.match(/^\\\\([^\\]+)\\(.+)$/);
      if (match) {
        const serverName = match[1];
        console.log('CLIENT MODE: UNC path to server', serverName);
        return { valid: true, path: content, isClient: true, serverIP: serverName };
      }
      return { valid: false, error: 'Invalid UNC path format', path: null, isClient: false };
    }

    // Server mode - local path like C:\PayrollAO\payroll.db
    const serverMatch = content.match(/^[A-Za-z]:\\.+$/);
    
    if (serverMatch) {
      console.log('SERVER MODE: Local database path:', content);
      return { valid: true, path: content, isClient: false };
    }

    return { valid: false, error: 'Invalid format. Use "C:\\path\\db.db" (server) or "\\\\server\\share\\db.db" (client)', path: null, isClient: false };
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

// ============= DATABASE CREATION (SERVER ONLY) =============

function createNewDatabase(customPath = null) {
  try {
    let targetPath = customPath;
    
    if (!targetPath) {
      const ipConfig = parseIPFile();
      if (!ipConfig.valid || !ipConfig.path) {
        return { success: false, error: 'Configure IP file with valid path first.' };
      }
      if (ipConfig.isClient) {
        return { success: false, error: 'Cannot create database from client. Create on server first.' };
      }
      targetPath = ipConfig.path;
    }

    if (fs.existsSync(targetPath)) {
      return { success: false, error: 'Database already exists.' };
    }

    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const Database = require('better-sqlite3');
    const newDb = new Database(targetPath);
    
    // Enable WAL mode for concurrent access
    newDb.pragma('journal_mode = WAL');
    newDb.pragma('busy_timeout = 30000');
    newDb.pragma('synchronous = NORMAL');
    
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
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
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
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES payroll_periods(id),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
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
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
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
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
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
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );

      INSERT OR IGNORE INTO users (id, username, password, name, role, is_active) 
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

// ============= SQLite DATABASE (Direct File Access with WAL) =============

function openDatabase(filePath) {
  try {
    const Database = require('better-sqlite3');
    
    // Open database with busy timeout for concurrent access
    const database = new Database(filePath, {
      timeout: 30000, // 30 second timeout for busy database
    });
    
    // Enable WAL mode for better concurrent access over network shares
    database.pragma('journal_mode = WAL');
    database.pragma('busy_timeout = 30000');
    database.pragma('synchronous = NORMAL');
    database.pragma('cache_size = -64000'); // 64MB cache
    
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

  dbPath = ipConfig.path;
  isClientMode = ipConfig.isClient;
  serverIP = ipConfig.serverIP || null;

  // Check if database file exists (works for both local and UNC paths)
  if (!checkDatabaseExists(dbPath)) {
    console.log('Database not found at:', dbPath);
    return { success: false, error: `Database not found at: ${dbPath}`, needsDatabase: true };
  }

  try {
    // Close existing connection if any
    if (db) {
      try { db.close(); } catch (e) {}
      db = null;
    }

    // Open database - SQLite handles WAL locking over network shares
    db = openDatabase(dbPath);
    
    runMigrations();
    
    console.log(`Database initialized: ${dbPath} (${isClientMode ? 'CLIENT via UNC' : 'SERVER local'})`);
    return { success: true, mode: isClientMode ? 'client' : 'server', path: dbPath };
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

// ============= DATABASE OPERATIONS (Direct SQLite) =============

function dbGetAll(table) {
  try {
    if (!db) return [];
    const stmt = db.prepare(`SELECT * FROM ${table}`);
    return stmt.all();
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
    serverIP: ipConfig.serverIP || null,
    exists: ipConfig.valid ? checkDatabaseExists(ipConfig.path) : false,
    connected: db !== null,
    error: ipConfig.error,
  };
});

ipcMain.handle('db:create', () => {
  return createNewDatabase();
});

ipcMain.handle('db:init', () => {
  return initDatabase();
});

ipcMain.handle('db:getAll', (event, table) => {
  return dbGetAll(table);
});

ipcMain.handle('db:getById', (event, table, id) => {
  return dbGetById(table, id);
});

ipcMain.handle('db:insert', (event, table, data) => {
  return dbInsert(table, data);
});

ipcMain.handle('db:update', (event, table, id, data) => {
  return dbUpdate(table, id, data);
});

ipcMain.handle('db:delete', (event, table, id) => {
  return dbDelete(table, id);
});

ipcMain.handle('db:query', (event, sql, params) => {
  return dbQuery(sql, params);
});

ipcMain.handle('db:export', () => {
  const data = dbExportAll();
  if (data) {
    return { success: true, data };
  }
  return { success: false, error: 'Failed to export data' };
});

ipcMain.handle('db:import', (event, data) => {
  return dbImportAll(data);
});

ipcMain.handle('db:testConnection', () => {
  try {
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

// ============= APP LIFECYCLE =============

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    try { db.close(); } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
