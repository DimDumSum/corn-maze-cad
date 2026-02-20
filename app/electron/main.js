const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Simplified for this demo
    },
  });

  // Load the React app (Vite default port)
  mainWindow.loadURL('http://localhost:5173');
}

function startPython() {
  console.log("Starting Python Engine...");
  // This points to core-engine/main.py
  const scriptPath = path.join(__dirname, '../../core-engine/main.py');
  
  // Spawns python.exe. Ensure Python is in your Windows PATH.
  pythonProcess = spawn('python', [scriptPath]);

  pythonProcess.stdout.on('data', (data) => console.log(`Python: ${data}`));
  pythonProcess.stderr.on('data', (data) => console.error(`Python Error: ${data}`));
}

app.whenReady().then(() => {
  startPython();
  createWindow();
});

// Kill Python when you close the window
app.on('will-quit', () => {
  if (pythonProcess) pythonProcess.kill();
});