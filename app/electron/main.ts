import { app, BrowserWindow, Menu, dialog, ipcMain, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;
const API_URL = 'http://127.0.0.1:8000';
const API_PORT = 8000;

// Python Process Management
async function startPythonBackend(): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const startTime = Date.now();

  console.log('[Python] Starting FastAPI backend...');

  try {
    // Check if Python backend is already running (e.g., from npm run dev:python)
    const isAlreadyRunning = await checkBackendAlreadyRunning();

    if (isAlreadyRunning) {
      console.log('[Python] Backend already running, skipping spawn');
      const elapsedTime = Date.now() - startTime;
      console.log(`[Python] Backend ready in ${elapsedTime}ms`);
      return;
    }

    // Backend not running, spawn it
    console.log('[Python] Backend not detected, spawning process...');

    if (isDev) {
      // Development: Run Python script directly
      // __dirname is app/electron/dist, so we need ../../../core-engine to reach the root
      const scriptPath = path.join(__dirname, '../../../core-engine/main.py');

      // Try different Python commands (py for Windows, python3, then python)
      const pythonCommand = process.platform === 'win32' ? 'py' : 'python3';
      console.log(`[Python] Dev mode - Running: ${pythonCommand} -m uvicorn main:app --port ${API_PORT}`);
      console.log(`[Python] Working directory: ${path.dirname(scriptPath)}`);

      pythonProcess = spawn(pythonCommand, ['-m', 'uvicorn', 'main:app', '--port', String(API_PORT)], {
        cwd: path.dirname(scriptPath),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } else {
      // Production: Run bundled Python executable
      const pythonExe = path.join(process.resourcesPath, 'python', 'python.exe');
      const scriptPath = path.join(process.resourcesPath, 'core-engine', 'main.py');
      console.log(`[Python] Production mode - Running: ${pythonExe}`);

      pythonProcess = spawn(pythonExe, ['-m', 'uvicorn', 'main:app', '--port', String(API_PORT)], {
        cwd: path.dirname(scriptPath),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    }

    // Log Python output
    if (pythonProcess.stdout) {
      pythonProcess.stdout.on('data', (data) => {
        console.log(`[Python] ${data.toString().trim()}`);
      });
    }

    if (pythonProcess.stderr) {
      pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python Error] ${data.toString().trim()}`);
      });
    }

    pythonProcess.on('error', (error) => {
      console.error('[Python] Failed to start process:', error);
      dialog.showErrorBox(
        'Backend Error',
        `Failed to start Python backend:\n${error.message}\n\nThe application will now close.`
      );
      app.quit();
    });

    pythonProcess.on('exit', (code, signal) => {
      console.log(`[Python] Process exited with code ${code} and signal ${signal}`);
      if (code !== 0 && code !== null) {
        // Provide helpful error message based on exit code
        let errorMessage = `Python backend exited with code ${code}.`;
        let suggestion = '';

        if (code === 1) {
          suggestion = `\n\nPossible causes:\n` +
            `• Port ${API_PORT} may already be in use by another application\n` +
            `• A previous instance may not have closed properly\n` +
            `• Missing Python dependencies\n\n` +
            `To fix:\n` +
            `1. Close any other applications using port ${API_PORT}\n` +
            `2. Wait a few seconds and try again\n` +
            `3. On Windows, run: taskkill /f /im python.exe`;
        }

        dialog.showErrorBox(
          'Backend Error',
          `${errorMessage}${suggestion}\n\nThe application will now close.`
        );
        app.quit();
      }
    });

    // Wait for backend to be ready
    console.log('[Python] Waiting for backend to be ready...');
    await waitForBackendReady();

    const elapsedTime = Date.now() - startTime;
    console.log(`[Python] Backend ready in ${elapsedTime}ms`);
  } catch (error) {
    console.error('[Python] Startup failed:', error);
    dialog.showErrorBox(
      'Backend Error',
      `Failed to start Python backend:\n${error}\n\nThe application will now close.`
    );
    app.quit();
  }
}

async function checkBackendAlreadyRunning(): Promise<boolean> {
  try {
    console.log(`[Python] Checking if backend is already running at ${API_URL}/health...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${API_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as { status: string };
      console.log(`[Python] Health check response:`, data);
      return data.status === 'ok';
    }
    console.log(`[Python] Health check failed with status: ${response.status}`);
  } catch (error: any) {
    console.log(`[Python] Health check error: ${error.message}`);
  }
  return false;
}

async function waitForBackendReady(): Promise<void> {
  const maxAttempts = 60; // 30 seconds (60 * 500ms)
  let attempts = 0;
  let lastError = '';

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        const data = (await response.json()) as { status: string };
        if (data.status === 'ok') {
          return;
        }
      }
      lastError = `HTTP ${response.status}`;
    } catch (error: any) {
      lastError = error.code || error.message || 'Connection refused';
      // Backend not ready yet, continue polling
    }

    // Log progress every 5 attempts
    if (attempts > 0 && attempts % 5 === 0) {
      console.log(`[Python] Still waiting for backend... (${attempts * 500 / 1000}s, last error: ${lastError})`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    attempts++;
  }

  throw new Error(`Backend failed to start within 30 seconds. Last error: ${lastError}\n\nThis may indicate port ${API_PORT} is in use or a configuration issue.`);
}

function stopPythonBackend(): Promise<void> {
  return new Promise((resolve) => {
    if (!pythonProcess) {
      resolve();
      return;
    }

    console.log('[Python] Stopping backend...');

    // Set a timeout for forceful kill
    const killTimeout = setTimeout(() => {
      console.log('[Python] Force killing backend (SIGKILL)');
      pythonProcess?.kill('SIGKILL');
      resolve();
    }, 5000);

    // Try graceful shutdown first
    pythonProcess.on('exit', () => {
      clearTimeout(killTimeout);
      console.log('[Python] Backend stopped gracefully');
      pythonProcess = null;
      resolve();
    });

    // Send SIGTERM for graceful shutdown
    pythonProcess.kill('SIGTERM');
  });
}

// Window Management
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Corn Maze CAD',
    show: false, // Don't show until backend is ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Note: .js after compilation
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load app based on environment
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu:new');
          },
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (!mainWindow) return;
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Maze Files', extensions: ['maze', 'json'] },
                { name: 'All Files', extensions: ['*'] },
              ],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('menu:open', result.filePaths[0]);
            }
          },
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu:save');
          },
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            if (!mainWindow) return;
            const result = await dialog.showSaveDialog(mainWindow, {
              filters: [
                { name: 'Maze Files', extensions: ['maze'] },
                { name: 'JSON Files', extensions: ['json'] },
              ],
            });
            if (!result.canceled && result.filePath) {
              mainWindow.webContents.send('menu:save-as', result.filePath);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => {
            mainWindow?.webContents.send('menu:undo');
          },
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => {
            mainWindow?.webContents.send('menu:redo');
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            mainWindow?.webContents.send('menu:zoom-in');
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow?.webContents.send('menu:zoom-out');
          },
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow?.webContents.send('menu:zoom-reset');
          },
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            mainWindow?.webContents.toggleDevTools();
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About Corn Maze CAD',
              message: 'Corn Maze CAD',
              detail: `Version ${app.getVersion()}\n\nA desktop application for designing corn mazes with GPS integration and GIS export capabilities.`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
function registerIpcHandlers(): void {
  // File dialog - Open
  ipcMain.handle('dialog:openFile', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Maze Files', extensions: ['maze', 'json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // File dialog - Save
  ipcMain.handle('dialog:saveFile', async (_, content: string) => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'Maze Files', extensions: ['maze'] },
        { name: 'JSON Files', extensions: ['json'] },
      ],
    });
    if (result.canceled || !result.filePath) return null;

    fs.writeFileSync(result.filePath, content);
    return result.filePath;
  });

  // File dialog - Open boundary file (GIS formats)
  ipcMain.handle('open-boundary-file', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'All Supported Formats', extensions: ['kml', 'kmz', 'shp', 'geojson', 'json', 'csv'] },
        { name: 'KML Files', extensions: ['kml'] },
        { name: 'KMZ Files', extensions: ['kmz'] },
        { name: 'Shapefiles (.shp + .shx + .dbf + .prj)', extensions: ['shp'] },
        { name: 'GeoJSON', extensions: ['geojson', 'json'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();

    try {
      // Check if this is a shapefile - need to read companion files
      if (ext === '.shp') {
        const basePath = filePath.slice(0, -4); // Remove .shp extension
        const files: Record<string, number[]> = {};

        // Required shapefile components
        const requiredExts = ['.shp', '.shx', '.dbf'];
        const optionalExts = ['.prj'];

        // Read required files
        for (const fileExt of requiredExts) {
          const compPath = basePath + fileExt;
          if (!fs.existsSync(compPath)) {
            dialog.showErrorBox(
              'Incomplete Shapefile',
              `Missing required file: ${path.basename(compPath)}\n\nShapefiles require .shp, .shx, and .dbf files.`
            );
            return null;
          }
          const buffer = fs.readFileSync(compPath);
          files[fileExt] = Array.from(buffer);
        }

        // Read optional files
        for (const fileExt of optionalExts) {
          const compPath = basePath + fileExt;
          if (fs.existsSync(compPath)) {
            const buffer = fs.readFileSync(compPath);
            files[fileExt] = Array.from(buffer);
          }
        }

        return {
          path: filePath,
          files: files, // Multi-file shapefile bundle
        };
      } else {
        // Single file (KML, KMZ, GeoJSON, CSV)
        const buffer = fs.readFileSync(filePath);
        return {
          path: filePath,
          buffer: Array.from(buffer),
        };
      }
    } catch (error) {
      console.error('Failed to read boundary file:', error);
      dialog.showErrorBox(
        'File Read Error',
        `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return null;
    }
  });

  // Message dialog
  ipcMain.handle('dialog:showMessage', async (_, message: string, type: 'info' | 'warning' | 'error') => {
    if (!mainWindow) return;
    await dialog.showMessageBox(mainWindow, {
      type,
      message,
    });
  });

  // App info
  ipcMain.handle('app:getPath', () => {
    return app.getAppPath();
  });

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  // API URL
  ipcMain.handle('get-api-url', () => {
    return API_URL;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Set up Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob: https://*.arcgisonline.com https://*.tile.openstreetmap.org; " +
            "font-src 'self' data:; " +
            "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://nominatim.openstreetmap.org https://*.arcgisonline.com https://*.tile.openstreetmap.org"
        ],
      },
    });
  });

  registerIpcHandlers();

  // Start Python backend first
  await startPythonBackend();

  // Then create window and menu
  createWindow();
  createMenu();
});

// Graceful shutdown
app.on('before-quit', async (event) => {
  if (pythonProcess) {
    event.preventDefault(); // Prevent immediate quit
    await stopPythonBackend();
    app.quit(); // Quit after Python is stopped
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
