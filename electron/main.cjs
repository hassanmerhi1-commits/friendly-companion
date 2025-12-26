const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

// Get the user data path for storing app data
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'payroll.db');
const networkConfigPath = path.join(userDataPath, 'network-config.json');

let mainWindow;
let httpServer = null;
let serverPort = 3847;
let db = null;

// Get the correct path for production vs development
function getDistPath() {
  const appPath = app.getAppPath();
  return path.join(appPath, 'dist', 'index.html');
}

// ============= SQLite DATABASE =============

function initDatabase() {
  try {
    const Database = require('better-sqlite3');
    db = new Database(dbPath);
    
    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');
    
    // Create tables
    db.exec(`
      -- Employees table
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        position TEXT,
        department TEXT,
        branch_id TEXT,
        hire_date TEXT,
        birth_date TEXT,
        salary REAL DEFAULT 0,
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
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Branches table
      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        manager TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Deductions table
      CREATE TABLE IF NOT EXISTS deductions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        value REAL DEFAULT 0,
        is_percentage INTEGER DEFAULT 0,
        is_mandatory INTEGER DEFAULT 0,
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Payroll records table
      CREATE TABLE IF NOT EXISTS payroll_records (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        base_salary REAL DEFAULT 0,
        gross_salary REAL DEFAULT 0,
        net_salary REAL DEFAULT 0,
        total_deductions REAL DEFAULT 0,
        total_bonuses REAL DEFAULT 0,
        deductions_json TEXT,
        bonuses_json TEXT,
        status TEXT DEFAULT 'pending',
        paid_at TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      );
      
      -- Holidays table
      CREATE TABLE IF NOT EXISTS holidays (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT DEFAULT 'national',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Users table (for app authentication)
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Settings table
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
    
    console.log('SQLite database initialized at:', dbPath);
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
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
      payroll_records: dbGetAll('payroll_records'),
      holidays: dbGetAll('holidays'),
      users: dbGetAll('users'),
      settings: dbGetAll('settings'),
      documents: dbGetAll('documents'),
      exportedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    return null;
  }
}

// Import all data for sync
function dbImportAll(data) {
  try {
    const tables = ['employees', 'branches', 'deductions', 'payroll_records', 'holidays', 'users', 'settings', 'documents'];
    
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
        const allowedTables = ['employees', 'branches', 'deductions', 'payroll_records', 'holidays', 'settings'];
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
        const allowedTables = ['employees', 'branches', 'deductions', 'payroll_records', 'holidays'];
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
        const allowedTables = ['employees', 'branches', 'deductions', 'payroll_records', 'holidays'];
        if (allowedTables.includes(table)) {
          let body = '';
          req.on('data', chunk => { body += chunk; });
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
        const allowedTables = ['employees', 'branches', 'deductions', 'payroll_records', 'holidays'];
        if (allowedTables.includes(table)) {
          let body = '';
          req.on('data', chunk => { body += chunk; });
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
        const allowedTables = ['employees', 'branches', 'deductions', 'payroll_records', 'holidays'];
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
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: serverIP,
      port: port,
      path: '/api/data',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject({ success: false, error: 'Invalid response' });
        }
      });
    });

    req.on('error', (error) => {
      reject({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ success: false, error: 'Connection timeout' });
    });

    req.end();
  });
}

// Push data to remote server (client mode)
async function pushToServer(serverIP, port, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const req = http.request({
      hostname: serverIP,
      port: port,
      path: '/api/data',
      method: 'POST',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (error) {
          reject({ success: false, error: 'Invalid response' });
        }
      });
    });

    req.on('error', (error) => {
      reject({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ success: false, error: 'Connection timeout' });
    });

    req.write(postData);
    req.end();
  });
}

// Ping server to check connection
async function pingServer(serverIP, port = 3847) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: serverIP,
      port: port,
      path: '/api/ping',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ success: true, data: parsed });
        } catch {
          resolve({ success: false, error: 'Invalid response' });
        }
      });
    });

    req.on('error', () => {
      resolve({ success: false, error: 'Connection failed' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    });

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