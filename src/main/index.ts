import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from './db/connection';
import { runMigrations } from './db/migrations';
import { registerIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      // 1. Initialize SQLite database and run pending migrations before window creation
      const db = initDatabase();
      const migrationResult = runMigrations(db);
      console.log(`Database initialized. Migrations applied: ${migrationResult.applied.length}, Total active: ${migrationResult.totalAlreadyApplied + migrationResult.applied.length}`);

      // 2. Register typed IPC handlers
      registerIpcHandlers();

      // 3. Create the main application window
      createWindow();
    } catch (err) {
      console.error('Fatal initialization error:', err);
      dialog.showErrorBox(
        'Cricket360 - Database Initialization Error',
        `A critical error occurred while initializing the database or applying migrations:\n\n${err instanceof Error ? err.message : String(err)}\n\nThe application will now close to prevent data corruption. Please contact technical support.`
      );
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    closeDatabase();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

function createWindow(): void {
  const isDev = !app.isPackaged && Boolean(process.env.VITE_DEV_SERVER_URL);

  mainWindow = new BrowserWindow({
    title: 'Cricket360 - Sports Shop Management',
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#F3F5F4',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Display window when ready to avoid visual flicker
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Restrict navigation and external window popups
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isDevUrl = isDev && url.startsWith('http://localhost:5173');
    const isFileUrl = url.startsWith('file://');
    if (!isDevUrl && !isFileUrl) {
      event.preventDefault();
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}
