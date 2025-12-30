const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

// Get the data directory - both dev and win-unpacked use project root's data folder
function getDataDir() {
  if (app.isPackaged) {
    const exeDir = path.dirname(app.getPath('exe'));
    
    // Check if running from win-unpacked (portable version inside project)
    // Path: ProjectRoot/dist-electron/win-unpacked/PayrollAO.exe
    if (exeDir.includes('win-unpacked')) {
      const projectRoot = path.join(exeDir, '..', '..');
      return path.join(projectRoot, 'data');
    }
    
    // Installed version - use folder next to exe
    return path.join(exeDir, 'data');
  }
  
  // Development mode: electron/main.cjs -> go up one level to project root
  return path.join(__dirname, '..', 'data');
}

const dataDir = getDataDir();

// Ensure data directory exists
if (!require('fs').existsSync(dataDir)) {
  require('fs').mkdirSync(dataDir, { recursive: true });
}

const localDbPath = path.join(dataDir, 'payroll.db');
const networkConfigPath = path.join(dataDir, 'network-config.json');
const serverConfigPath = path.join(dataDir, 'server-config.txt'); // Dolly-style simple config

let mainWindow;
let httpServer = null;
let serverPort = 3847;
let db = null;
let dbPath = localDbPath; // Will be updated if client mode
let isClientMode = false;

// ============= CLIENT MODE DATABASE PATH =============
// Check if server-config.txt exists and use remote database path
function getRemoteDatabasePath() {
  try {
    if (!fs.existsSync(serverConfigPath)) return null;

    const raw = fs.readFileSync(serverConfigPath, 'utf-8').trim();
    if (!raw) return null;

    // Supported formats:
    // 1) IP:PATH
    //    - PATH can be a local Windows folder (e.g., "C:\\PayrollAO\\data")
    //    - or a UNC shared folder (e.g., "\\\\SERVER\\ShareName\\PayrollAO\\data")
    // 2) UNC_PATH_ONLY (e.g., "\\\\SERVER\\ShareName\\PayrollAO\\data")
    //
    // Notes:
    // - If PATH is local (C:\...), we fall back to the Windows admin share (\\IP\C$\...) which
    //   requires admin shares enabled + permissions.
    // - If PATH is UNC (\\SERVER\Share...), it works with normal shared folders.

    const colonIndex = raw.indexOf(':');

    // UNC-only (no leading IP)
    if (colonIndex <= 0) {
      if (raw.startsWith('\\\\')) {
        const base = raw.replace(/\//g, '\\').replace(/[\\]+$/, '');
        return base.toLowerCase().endsWith('.db') ? base : `${base}\\payroll.db`;
      }
      return null;
    }

    const ip = raw.substring(0, colonIndex);
    const pathPart = raw.substring(colonIndex + 1);

    // Old port-only format (IP:3847) => not a direct DB path
    if (/^\d+$/.test(pathPart)) return null;

    const normalized = pathPart.replace(/\//g, '\\').trim();

    // If user provided UNC, use it directly (ignore IP)
    if (normalized.startsWith('\\\\')) {
      const base = normalized.replace(/[\\]+$/, '');
      const finalPath = base.toLowerCase().endsWith('.db') ? base : `${base}\\payroll.db`;
      console.log('Remote database UNC path:', finalPath);
      return finalPath;
    }

    // Local Windows path -> admin share fallback
    const cleanedLocal = normalized.replace(/[\\]+$/, '');
    const adminSharePath = cleanedLocal.replace(/^([A-Za-z]):/, '$1$$');
    const finalPath = `\\\\${ip}\\${adminSharePath}\\payroll.db`;
    console.log('Remote database admin-share path:', finalPath);
    return finalPath;
  } catch (error) {
    console.error('Error reading server config for remote path:', error);
    return null;
  }
}

// Check for client mode on startup
const remotePath = getRemoteDatabasePath();
if (remotePath) {
  // Verify the remote database exists
  try {
    if (fs.existsSync(remotePath)) {
      dbPath = remotePath;
      isClientMode = true;
      console.log('CLIENT MODE: Using remote database at', dbPath);
    } else {
      console.log('Remote database not accessible, using local database');
    }
  } catch (error) {
    console.error('Cannot access remote database:', error.message);
    console.log('Using local database instead');
  }
}

// Get the correct path for production vs development
function getDistPath() {
  if (app.isPackaged) {
    // In production, check multiple possible locations
    const possiblePaths = [
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(path.dirname(app.getPath('exe')), 'resources', 'app', 'dist', 'index.html'),
      path.join(__dirname, '..', 'dist', 'index.html'),
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log('Found index.html at:', p);
        return p;
      }
    }
    
    // Fallback to default
    console.log('Using fallback path');
    return path.join(app.getAppPath(), 'dist', 'index.html');
  }
  
  return path.join(__dirname, '..', 'dist', 'index.html');
}

// ============= SQLite DATABASE =============

function initDatabase() {
  try {
    const Database = require('better-sqlite3');
    db = new Database(dbPath);
    
    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');
    
    // Create tables with full schema matching app types
    db.exec(`
      -- Employees table (matches src/types/employee.ts Employee interface)
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
      
      -- Branches table (matches src/types/branch.ts Branch interface)
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
      
      -- Deductions table (matches src/types/deduction.ts Deduction interface)
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
      
      -- Payroll periods table (matches src/types/payroll.ts PayrollPeriod interface)
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
      
      -- Payroll entries table (matches src/types/payroll.ts PayrollEntry interface)
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
      
      -- Holiday records table (matches src/stores/holiday-store.ts HolidayRecord interface)
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
      
      -- Users table (matches src/stores/auth-store.ts AppUser interface)
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
      
      -- Absences table (matches src/types/absence.ts Absence interface)
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
      
      -- Settings table (key-value store for app settings)
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Documents table
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        employee_id TEXT,
        name TEXT NOT NULL,
        type TEXT,
        file_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );
    `);
    
    // Run migrations to add missing columns to existing databases
    runMigrations();
    
    console.log('SQLite database initialized at:', dbPath);
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Run database migrations for schema changes
function runMigrations() {
  try {
    // Helper to add column if missing
    const addColumnIfMissing = (table, column, sql) => {
      try {
        const info = db.prepare(`PRAGMA table_info(${table})`).all();
        const columns = info.map(col => col.name);
        if (!columns.includes(column)) {
          db.exec(sql);
          console.log(`Migration: Added column ${column} to ${table}`);
        }
      } catch (err) {
        console.error(`Migration error for ${table}.${column}:`, err.message);
      }
    };
    
    // ===== EMPLOYEES MIGRATIONS =====
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
    // Migrate old salary to base_salary if base_salary is null/0
    try {
      db.exec("UPDATE employees SET base_salary = salary WHERE base_salary IS NULL OR base_salary = 0");
    } catch (err) { /* ignore */ }
    
    // ===== BRANCHES MIGRATIONS =====
    addColumnIfMissing('branches', 'code', "ALTER TABLE branches ADD COLUMN code TEXT");
    addColumnIfMissing('branches', 'province', "ALTER TABLE branches ADD COLUMN province TEXT");
    addColumnIfMissing('branches', 'city', "ALTER TABLE branches ADD COLUMN city TEXT");
    addColumnIfMissing('branches', 'email', "ALTER TABLE branches ADD COLUMN email TEXT");
    addColumnIfMissing('branches', 'manager_id', "ALTER TABLE branches ADD COLUMN manager_id TEXT");
    addColumnIfMissing('branches', 'is_headquarters', "ALTER TABLE branches ADD COLUMN is_headquarters INTEGER DEFAULT 0");
    addColumnIfMissing('branches', 'is_active', "ALTER TABLE branches ADD COLUMN is_active INTEGER DEFAULT 1");
    // Migrate old status to is_active
    try {
      db.exec("UPDATE branches SET is_active = CASE WHEN status = 'active' THEN 1 ELSE 0 END WHERE is_active IS NULL");
    } catch (err) { /* ignore */ }
    
    // ===== DEDUCTIONS MIGRATIONS =====
    addColumnIfMissing('deductions', 'employee_id', "ALTER TABLE deductions ADD COLUMN employee_id TEXT");
    addColumnIfMissing('deductions', 'amount', "ALTER TABLE deductions ADD COLUMN amount REAL DEFAULT 0");
    addColumnIfMissing('deductions', 'date', "ALTER TABLE deductions ADD COLUMN date TEXT");
    addColumnIfMissing('deductions', 'payroll_period_id', "ALTER TABLE deductions ADD COLUMN payroll_period_id TEXT");
    addColumnIfMissing('deductions', 'is_applied', "ALTER TABLE deductions ADD COLUMN is_applied INTEGER DEFAULT 0");
    addColumnIfMissing('deductions', 'installments', "ALTER TABLE deductions ADD COLUMN installments INTEGER");
    addColumnIfMissing('deductions', 'current_installment', "ALTER TABLE deductions ADD COLUMN current_installment INTEGER");
    
    // ===== USERS MIGRATIONS =====
    addColumnIfMissing('users', 'is_active', "ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1");
    addColumnIfMissing('users', 'custom_permissions', "ALTER TABLE users ADD COLUMN custom_permissions TEXT");
    // Migrate old status to is_active
    try {
      db.exec("UPDATE users SET is_active = CASE WHEN status = 'active' THEN 1 ELSE 0 END WHERE is_active IS NULL");
    } catch (err) { /* ignore */ }
    
    // ===== ABSENCES MIGRATIONS =====
    addColumnIfMissing('absences', 'document_path', "ALTER TABLE absences ADD COLUMN document_path TEXT");
    addColumnIfMissing('absences', 'justified_at', "ALTER TABLE absences ADD COLUMN justified_at TEXT");
    addColumnIfMissing('absences', 'justification_document', "ALTER TABLE absences ADD COLUMN justification_document TEXT");
    addColumnIfMissing('absences', 'justification_notes', "ALTER TABLE absences ADD COLUMN justification_notes TEXT");
    addColumnIfMissing('absences', 'approved_by', "ALTER TABLE absences ADD COLUMN approved_by TEXT");
    addColumnIfMissing('absences', 'approved_at', "ALTER TABLE absences ADD COLUMN approved_at TEXT");
    addColumnIfMissing('absences', 'rejection_reason', "ALTER TABLE absences ADD COLUMN rejection_reason TEXT");
    
    // ===== HOLIDAYS MIGRATIONS =====
    addColumnIfMissing('holidays', 'employee_id', "ALTER TABLE holidays ADD COLUMN employee_id TEXT");
    addColumnIfMissing('holidays', 'year', "ALTER TABLE holidays ADD COLUMN year INTEGER");
    addColumnIfMissing('holidays', 'days_used', "ALTER TABLE holidays ADD COLUMN days_used INTEGER DEFAULT 0");
    addColumnIfMissing('holidays', 'start_date', "ALTER TABLE holidays ADD COLUMN start_date TEXT");
    addColumnIfMissing('holidays', 'end_date', "ALTER TABLE holidays ADD COLUMN end_date TEXT");
    addColumnIfMissing('holidays', 'subsidy_paid', "ALTER TABLE holidays ADD COLUMN subsidy_paid INTEGER DEFAULT 0");
    addColumnIfMissing('holidays', 'subsidy_paid_month', "ALTER TABLE holidays ADD COLUMN subsidy_paid_month INTEGER");
    addColumnIfMissing('holidays', 'subsidy_paid_year', "ALTER TABLE holidays ADD COLUMN subsidy_paid_year INTEGER");
    
    // ===== CREATE NEW TABLES IF MISSING =====
    // Check if payroll_periods exists
    try {
      db.prepare("SELECT 1 FROM payroll_periods LIMIT 1").get();
    } catch (err) {
      // Table doesn't exist, create it
      db.exec(`
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
        )
      `);
      console.log('Migration: Created payroll_periods table');
    }
    
    // Check if payroll_entries exists
    try {
      db.prepare("SELECT 1 FROM payroll_entries LIMIT 1").get();
    } catch (err) {
      // Table doesn't exist, create it
      db.exec(`
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
        )
      `);
      console.log('Migration: Created payroll_entries table');
    }
    
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

// Generic database operations
function dbGetAll(table) {
  try {
    const stmt = db.prepare(`SELECT * FROM ${table}`);
    return stmt.all();
  } catch (error) {
    console.error(`Error getting all from ${table}:`, error);
    return [];
  }
}

function dbGetById(table, id) {
  try {
    const stmt = db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    return stmt.get(id);
  } catch (error) {
    console.error(`Error getting ${id} from ${table}:`, error);
    return null;
  }
}

function dbInsert(table, data) {
  try {
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

// Export all data for sync
function dbExportAll() {
  try {
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

// Import all data for sync
function dbImportAll(data) {
  try {
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

    db.exec('BEGIN TRANSACTION');

    for (const table of tables) {
      if (data[table] && Array.isArray(data[table])) {
        // Clear existing data
        db.exec(`DELETE FROM ${table}`);

        // Insert new data
        for (const row of data[table]) {
          dbInsert(table, row);
        }
      }
    }

    db.exec('COMMIT');
    return { success: true };
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Error importing data:', error);
    return { success: false, error: error.message };
  }
}

// Get local IP addresses
function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name: name,
          address: iface.address
        });
      }
    }
  }
  
  return addresses;
}

// Read network config
function readNetworkConfig() {
  try {
    if (fs.existsSync(networkConfigPath)) {
      const data = fs.readFileSync(networkConfigPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading network config:', error);
  }
  return { mode: 'standalone', serverIP: '', serverPort: 3847 };
}

// Write network config
function writeNetworkConfig(config) {
  try {
    fs.writeFileSync(networkConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing network config:', error);
    return false;
  }
}

// ============= DOLLY-STYLE SERVER CONFIG FILE =============
// Simple text file format: IP:PATH (e.g., "10.0.0.45:C:\PayrollAO\data")
// This allows clients to connect to a server's database folder

// Read server-config.txt (Dolly-style)
function readServerConfigFile() {
  try {
    if (fs.existsSync(serverConfigPath)) {
      const content = fs.readFileSync(serverConfigPath, 'utf-8').trim();
      if (content) {
        // Format: IP:PATH (e.g., "10.0.0.45:C:\PayrollAO\data")
        // Split on first colon only to preserve Windows paths with drive letters
        const colonIndex = content.indexOf(':');
        if (colonIndex > 0) {
          const ip = content.substring(0, colonIndex);
          const restAfterIp = content.substring(colonIndex + 1);
          
          // Check if this is IP:PORT format (old) or IP:PATH format (new)
          // If it's just a number, it's the old port format
          if (/^\d+$/.test(restAfterIp)) {
            // Old format: IP:PORT - treat as port
            return {
              exists: true,
              serverIP: ip,
              serverPort: parseInt(restAfterIp) || 3847,
              serverPath: ''
            };
          } else {
            // New format: IP:PATH (e.g., "10.0.0.45:C:\PayrollAO\data")
            // The path might start with a drive letter like C:
            return {
              exists: true,
              serverIP: ip,
              serverPort: 3847, // Default port
              serverPath: restAfterIp // Full path including drive letter
            };
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading server-config.txt:', error);
  }
  return { exists: false, serverIP: '', serverPort: 3847, serverPath: '' };
}

// Write server-config.txt (Dolly-style) - Server creates this for clients
// Format: IP:PATH (e.g., "10.0.0.45:C:\PayrollAO\data")
function writeServerConfigFile(ip, pathOrPort) {
  try {
    // Support both old format (IP, port) and new format (IP, path)
    const content = `${ip}:${pathOrPort}`;
    fs.writeFileSync(serverConfigPath, content, 'utf-8');
    console.log('Server config file created:', content);
    return { success: true, path: serverConfigPath, content };
  } catch (error) {
    console.error('Error writing server-config.txt:', error);
    return { success: false, error: error.message };
  }
}

// Delete server-config.txt
function deleteServerConfigFile() {
  try {
    if (fs.existsSync(serverConfigPath)) {
      fs.unlinkSync(serverConfigPath);
      console.log('Server config file deleted');
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting server-config.txt:', error);
    return { success: false, error: error.message };
  }
}

// Get the path to server-config.txt
function getServerConfigFilePath() {
  return serverConfigPath;
}

// Get local data path (for server mode - tells clients where the database is)
function getLocalDataPath() {
  return dataDir;
}

// Create the main application window
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
    console.log('Loading from:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============= HTTP SERVER FOR LAN SHARING =============

function startServer(port = 3847) {
  return new Promise((resolve, reject) => {
    if (httpServer) {
      resolve({ success: true, port: serverPort, message: 'Server already running' });
      return;
    }

    serverPort = port;

    httpServer = http.createServer((req, res) => {
      // CORS headers for LAN access
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // GET /api/data - Fetch all data (for sync)
      if (req.method === 'GET' && req.url === '/api/data') {
        const data = dbExportAll();
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data: data || {} }));
        return;
      }

      // POST /api/data - Import all data (for sync)
      if (req.method === 'POST' && req.url === '/api/data') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const result = dbImportAll(data);
            res.writeHead(result.success ? 200 : 500);
            res.end(JSON.stringify(result));
          } catch (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
          }
        });
        return;
      }

      // GET /api/:table - Get all records from a table
      const getMatch = req.url.match(/^\/api\/(\w+)$/);
      if (req.method === 'GET' && getMatch) {
        const table = getMatch[1];
        const allowedTables = [
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
        if (allowedTables.includes(table)) {
          const data = dbGetAll(table);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, data }));
          return;
        }
      }

      // GET /api/:table/:id - Get single record
      const getByIdMatch = req.url.match(/^\/api\/(\w+)\/(.+)$/);
      if (req.method === 'GET' && getByIdMatch) {
        const [, table, id] = getByIdMatch;
        const allowedTables = [
          'employees',
          'branches',
          'deductions',
          'payroll_periods',
          'payroll_entries',
          'holidays',
          'absences',
          'users',
          'documents',
        ];
        if (allowedTables.includes(table)) {
          const data = dbGetById(table, id);
          res.writeHead(data ? 200 : 404);
          res.end(JSON.stringify({ success: !!data, data }));
          return;
        }
      }

      // POST /api/:table - Insert record
      if (req.method === 'POST' && getMatch) {
        const table = getMatch[1];
        const allowedTables = [
          'employees',
          'branches',
          'deductions',
          'payroll_periods',
          'payroll_entries',
          'holidays',
          'absences',
          'users',
          'documents',
        ];
        if (allowedTables.includes(table)) {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const result = dbInsert(table, data);
              res.writeHead(result.success ? 200 : 500);
              res.end(JSON.stringify(result));
            } catch (error) {
              res.writeHead(400);
              res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
          });
          return;
        }
      }

      // PUT /api/:table/:id - Update record
      if (req.method === 'PUT' && getByIdMatch) {
        const [, table, id] = getByIdMatch;
        const allowedTables = [
          'employees',
          'branches',
          'deductions',
          'payroll_periods',
          'payroll_entries',
          'holidays',
          'absences',
          'users',
          'documents',
        ];
        if (allowedTables.includes(table)) {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const result = dbUpdate(table, id, data);
              res.writeHead(result.success ? 200 : 500);
              res.end(JSON.stringify(result));
            } catch (error) {
              res.writeHead(400);
              res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
          });
          return;
        }
      }

      // DELETE /api/:table/:id - Delete record
      if (req.method === 'DELETE' && getByIdMatch) {
        const [, table, id] = getByIdMatch;
        const allowedTables = [
          'employees',
          'branches',
          'deductions',
          'payroll_periods',
          'payroll_entries',
          'holidays',
          'absences',
          'users',
          'documents',
        ];
        if (allowedTables.includes(table)) {
          const result = dbDelete(table, id);
          res.writeHead(result.success ? 200 : 500);
          res.end(JSON.stringify(result));
          return;
        }
      }

      // GET /api/ping - Health check
      if (req.method === 'GET' && req.url === '/api/ping') {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'PayrollAO Server (SQLite)', timestamp: Date.now() }));
        return;
      }

      // 404 for unknown routes
      res.writeHead(404);
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
    });

    httpServer.on('error', (error) => {
      console.error('Server error:', error);
      httpServer = null;
      reject({ success: false, error: error.message });
    });

    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`PayrollAO LAN Server (SQLite) running on port ${port}`);
      const ips = getLocalIPAddresses();
      console.log('Available at:', ips.map(ip => `http://${ip.address}:${port}`).join(', '));
      resolve({ success: true, port, addresses: ips });
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (httpServer) {
      httpServer.close(() => {
        httpServer = null;
        console.log('LAN Server stopped');
        resolve({ success: true });
      });
    } else {
      resolve({ success: true, message: 'Server not running' });
    }
  });
}

// Fetch data from remote server (client mode)
async function fetchFromServer(serverIP, port = 3847) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: serverIP,
        port: port,
        path: '/api/data',
        method: 'GET',
        timeout: 8000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode || 0;

          if (!data) {
            resolve({ success: false, error: `Empty response (HTTP ${status})` });
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (status >= 400) {
              resolve({ success: false, error: parsed?.error || `HTTP ${status}` });
              return;
            }
            resolve(parsed);
          } catch {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        });
      }
    );

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    });

    req.end();
  });
}

// Push data to remote server (client mode)
async function pushToServer(serverIP, port, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);

    const req = http.request(
      {
        hostname: serverIP,
        port: port,
        path: '/api/data',
        method: 'POST',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode || 0;

          if (!responseData) {
            resolve({ success: false, error: `Empty response (HTTP ${status})` });
            return;
          }

          try {
            const parsed = JSON.parse(responseData);
            if (status >= 400) {
              resolve({ success: false, error: parsed?.error || `HTTP ${status}` });
              return;
            }
            resolve(parsed);
          } catch {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        });
      }
    );

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    });

    req.write(postData);
    req.end();
  });
}

// Ping server to check connection
async function pingServer(serverIP, port = 3847) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: serverIP,
        port: port,
        path: '/api/ping',
        method: 'GET',
        timeout: 4000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode || 0;

          if (!data) {
            resolve({ success: false, error: `Empty response (HTTP ${status})` });
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const ok = status >= 200 && status < 300 && parsed?.success === true;
            resolve(ok ? { success: true, data: parsed } : { success: false, error: parsed?.error || `HTTP ${status}` });
          } catch {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        });
      }
    );

    req.on('error', (error) => {
      resolve({ success: false, error: error.message || 'Connection failed' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    });

    req.end();
  });
}

// ============= REMOTE DATABASE OPERATIONS (CLIENT MODE) =============
// These functions call the server's API directly for live central database mode

async function remoteDbGetAll(serverIP, port, table) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: serverIP,
        port: port,
        path: `/api/${table}`,
        method: 'GET',
        timeout: 8000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.success) {
              resolve({ success: true, data: parsed.data || [] });
            } else {
              resolve({ success: false, error: parsed.error || 'Failed to get data' });
            }
          } catch {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        });
      }
    );
    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
    req.end();
  });
}

async function remoteDbGetById(serverIP, port, table, id) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: serverIP,
        port: port,
        path: `/api/${table}/${encodeURIComponent(id)}`,
        method: 'GET',
        timeout: 8000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        });
      }
    );
    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
    req.end();
  });
}

async function remoteDbInsert(serverIP, port, table, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: serverIP,
        port: port,
        path: `/api/${table}`,
        method: 'POST',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        });
      }
    );
    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
    req.write(postData);
    req.end();
  });
}

async function remoteDbUpdate(serverIP, port, table, id, data) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(data);
    const req = http.request(
      {
        hostname: serverIP,
        port: port,
        path: `/api/${table}/${encodeURIComponent(id)}`,
        method: 'PUT',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        });
      }
    );
    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
    req.write(postData);
    req.end();
  });
}

async function remoteDbDelete(serverIP, port, table, id) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: serverIP,
        port: port,
        path: `/api/${table}/${encodeURIComponent(id)}`,
        method: 'DELETE',
        timeout: 8000,
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        });
      }
    );
    req.on('error', (error) => resolve({ success: false, error: error.message }));
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timeout' }); });
    req.end();
  });
}

// ============= IPC HANDLERS =============

// Database operations
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
  return dbExportAll();
});

ipcMain.handle('db:import', (event, data) => {
  return dbImportAll(data);
});

// Legacy storage operations (for backward compatibility)
ipcMain.handle('storage:read', () => {
  return dbExportAll();
});

ipcMain.handle('storage:write', (event, data) => {
  return dbImportAll(data);
});

ipcMain.handle('storage:getPath', () => {
  return dbPath;
});

// Network operations
ipcMain.handle('network:getConfig', () => {
  return readNetworkConfig();
});

ipcMain.handle('network:setConfig', (event, config) => {
  return writeNetworkConfig(config);
});

ipcMain.handle('network:getLocalIPs', () => {
  return getLocalIPAddresses();
});

ipcMain.handle('network:startServer', async (event, port) => {
  try {
    return await startServer(port);
  } catch (error) {
    return error;
  }
});

ipcMain.handle('network:stopServer', async () => {
  return await stopServer();
});

ipcMain.handle('network:getServerStatus', () => {
  return { 
    running: httpServer !== null, 
    port: serverPort,
    addresses: getLocalIPAddresses()
  };
});

ipcMain.handle('network:fetchFromServer', async (event, serverIP, port) => {
  try {
    return await fetchFromServer(serverIP, port);
  } catch (error) {
    return error;
  }
});

ipcMain.handle('network:pushToServer', async (event, serverIP, port, data) => {
  try {
    return await pushToServer(serverIP, port, data);
  } catch (error) {
    return error;
  }
});

ipcMain.handle('network:pingServer', async (event, serverIP, port) => {
  return await pingServer(serverIP, port);
});

// Dolly-style server config file handlers
ipcMain.handle('network:readServerConfigFile', () => {
  return readServerConfigFile();
});

ipcMain.handle('network:writeServerConfigFile', (event, ip, port) => {
  return writeServerConfigFile(ip, port);
});

ipcMain.handle('network:deleteServerConfigFile', () => {
  return deleteServerConfigFile();
});

ipcMain.handle('network:getServerConfigFilePath', () => {
  return getServerConfigFilePath();
});

ipcMain.handle('network:getLocalDataPath', () => {
  return dataDir;
});

// Get database connection mode info
ipcMain.handle('network:getDatabaseMode', () => {
  return {
    isClientMode: isClientMode,
    dbPath: dbPath,
    localDbPath: localDbPath,
    isConnectedToRemote: isClientMode && db !== null
  };
});

// Remote database operations (for client mode - live central database)
ipcMain.handle('remoteDb:getAll', async (event, serverIP, port, table) => {
  return await remoteDbGetAll(serverIP, port, table);
});

ipcMain.handle('remoteDb:getById', async (event, serverIP, port, table, id) => {
  return await remoteDbGetById(serverIP, port, table, id);
});

ipcMain.handle('remoteDb:insert', async (event, serverIP, port, table, data) => {
  return await remoteDbInsert(serverIP, port, table, data);
});

ipcMain.handle('remoteDb:update', async (event, serverIP, port, table, id, data) => {
  return await remoteDbUpdate(serverIP, port, table, id, data);
});

ipcMain.handle('remoteDb:delete', async (event, serverIP, port, table, id) => {
  return await remoteDbDelete(serverIP, port, table, id);
});

// ============= APP LIFECYCLE =============

app.whenReady().then(async () => {
  // Initialize database first
  initDatabase();
  
  createWindow();

  // Auto-start server if configured as server mode
  const config = readNetworkConfig();
  if (config.mode === 'server') {
    try {
      await startServer(config.serverPort || 3847);
      console.log('Auto-started server based on saved config');
    } catch (error) {
      console.error('Failed to auto-start server:', error);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopServer();
    if (db) {
      db.close();
    }
    app.quit();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});