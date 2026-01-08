const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true // This hides the menu bar, keeping the UI clean
  });

  // Handle external links (target="_blank" or window.open)
  // We allow them to open in a new Electron window (which has no URL bar),
  // rather than the system browser (which has a URL bar).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true, // No menu bar
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    }
    return { action: 'allow' };
  });

  // Check if we are in development mode based on an environment variable or argument
  // For the script we'll setup, we can assume if we can connect to localhost, we use it, 
  // but simpler is to check an env var.
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // Open the DevTools.
    // win.webContents.openDevTools();
  } else {
    // In production, load the index.html from the dist folder
    // Adjust logic to point to correct path relative to this file
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
