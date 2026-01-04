import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  })

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS, re-create a window when dock icon is clicked and no windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for file system operations
ipcMain.handle('fs:readFile', async (_event, path: string) => {
  const fs = await import('fs/promises')
  return fs.readFile(path, 'utf-8')
})

ipcMain.handle('fs:writeFile', async (_event, path: string, content: string) => {
  const fs = await import('fs/promises')
  await fs.writeFile(path, content, 'utf-8')
})

ipcMain.handle('fs:readDir', async (_event, path: string) => {
  const fs = await import('fs/promises')
  return fs.readdir(path, { withFileTypes: true })
})

ipcMain.handle('fs:exists', async (_event, path: string) => {
  const fs = await import('fs/promises')
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:mkdir', async (_event, path: string) => {
  const fs = await import('fs/promises')
  await fs.mkdir(path, { recursive: true })
})
