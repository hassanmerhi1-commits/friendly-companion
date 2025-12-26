const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

// Get the user data path for storing app data
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'payroll-data.json');
const networkConfigPath = path.join(userDataPath, 'network-config.json');

let mainWindow;
let httpServer = null;
let serverPort = 3847;

// Get the correct path for production vs development
function getDistPath() {
  const appPath = app.getAppPath();
  return path.join(appPath, 'dist', 'index.html');
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

// Read data from file
function readDataFile() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading data file:', error);
  }
  return null;
}

// Write data to file
function writeDataFile(data) {
  try {
    const dir = path.dirname(dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
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

      // GET /api/data - Fetch all data
      if (req.method === 'GET' && req.url === '/api/data') {
        const data = readDataFile();
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, data: data || {} }));
        return;
      }

      // POST /api/data - Update all data
      if (req.method === 'POST' && req.url === '/api/data') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const success = writeDataFile(data);
            res.writeHead(success ? 200 : 500);
            res.end(JSON.stringify({ success }));
          } catch (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
          }
        });
        return;
      }

      // GET /api/ping - Health check
      if (req.method === 'GET' && req.url === '/api/ping') {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'PayrollAO Server', timestamp: Date.now() }));
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
      console.log(`PayrollAO LAN Server running on port ${port}`);
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

// Storage operations
ipcMain.handle('storage:read', () => {
  return readDataFile();
});

ipcMain.handle('storage:write', (event, data) => {
  return writeDataFile(data);
});

ipcMain.handle('storage:getPath', () => {
  return dataFilePath;
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
    app.quit();
  }
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
