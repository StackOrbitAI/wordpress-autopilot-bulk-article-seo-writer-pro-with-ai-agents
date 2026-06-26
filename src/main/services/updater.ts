import { ipcMain, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';

export function setupAutoUpdater(mainWindow: BrowserWindow) {
  // Configure logging
  autoUpdater.logger = console;
  
  // Set auto-download to true for silent background updates
  autoUpdater.autoDownload = true;

  // Run update check automatically 5 seconds after startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('[Updater] Background startup update check failed:', err.message);
    });
  }, 5000);

  // Periodically check for updates every 30 seconds
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('[Updater] Background periodic update check failed:', err.message);
    });
  }, 30 * 1000); // 30 seconds in milliseconds

  // Helper to send events to Renderer
  function sendUpdateStatus(channel: string, data: any = {}) {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  }

  // 1. Hook autoUpdater events
  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus('updater-checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus('updater-update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus('updater-update-not-available', info);
  });

  autoUpdater.on('error', (err) => {
    sendUpdateStatus('updater-error', { message: err.message });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendUpdateStatus('updater-download-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus('updater-update-downloaded', info);
  });

  // 2. Hook IPC commands from Renderer
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, result };
    } catch (error: any) {
      console.error('[Updater] Check for updates failed:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error: any) {
      console.error('[Updater] Download update failed:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('updater:install', async () => {
    try {
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (error: any) {
      console.error('[Updater] Installing update failed:', error.message);
      return { success: false, error: error.message };
    }
  });
}
