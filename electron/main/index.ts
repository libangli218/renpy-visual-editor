import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { MenuManager } from './menuManager'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Only needed for Squirrel installer, not for NSIS
try {
  if (require('electron-squirrel-startup')) {
    app.quit()
  }
} catch {
  // electron-squirrel-startup not available, ignore (using NSIS installer)
}

// Register custom protocol as privileged BEFORE app is ready
// This is required for the protocol to work with fetch and CSS background-image
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
    }
  }
])

let mainWindow: BrowserWindow | null = null
let menuManager: MenuManager | null = null

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
    menuManager = null
  })

  // Create MenuManager after window is ready
  // Requirements: 8.1, 8.2, 8.3 - Menu state management
  menuManager = new MenuManager(mainWindow)
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Register custom protocol to serve local files (for preview panel images)
  protocol.handle('local-file', (request) => {
    // Extract the file path from the URL
    // URL format: local-file:///F:/path/to/file.jpg (three slashes + absolute path)
    let filePath = decodeURIComponent(request.url.replace('local-file:///', ''))
    
    // On Windows, the path might start with a drive letter like F:/
    // pathToFileURL expects backslashes on Windows, but forward slashes work too
    console.log('[local-file protocol] Request URL:', request.url)
    console.log('[local-file protocol] File path:', filePath)
    
    const fileUrl = pathToFileURL(filePath).toString()
    console.log('[local-file protocol] File URL:', fileUrl)
    
    return net.fetch(fileUrl)
  })

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

// Read file as base64 for images
ipcMain.handle('fs:readFileAsBase64', async (_event, filePath: string) => {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  try {
    const buffer = await fs.readFile(filePath)
    const base64 = buffer.toString('base64')
    const ext = path.extname(filePath).toLowerCase().slice(1)
    const mimeType = ext === 'jpg' ? 'jpeg' : ext
    return `data:image/${mimeType};base64,${base64}`
  } catch (error) {
    console.error('[fs:readFileAsBase64] Error reading file:', filePath, error)
    return null
  }
})

ipcMain.handle('fs:writeFile', async (_event, path: string, content: string) => {
  const fs = await import('fs/promises')
  await fs.writeFile(path, content, 'utf-8')
})

ipcMain.handle('fs:readDir', async (_event, path: string) => {
  const fs = await import('fs/promises')
  const entries = await fs.readdir(path, { withFileTypes: true })
  // Convert Dirent objects to plain objects for IPC serialization
  return entries.map(entry => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
  }))
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

ipcMain.handle('fs:copyDir', async (_event, src: string, dest: string) => {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  // Recursive copy function
  async function copyRecursive(srcPath: string, destPath: string) {
    const stat = await fs.stat(srcPath)
    
    if (stat.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true })
      const entries = await fs.readdir(srcPath)
      
      for (const entry of entries) {
        await copyRecursive(
          path.join(srcPath, entry),
          path.join(destPath, entry)
        )
      }
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
  
  await copyRecursive(src, dest)
})

ipcMain.handle('fs:copyFile', async (_event, src: string, dest: string) => {
  const fs = await import('fs/promises')
  await fs.copyFile(src, dest)
})

ipcMain.handle('fs:getAppPath', async () => {
  // In development, return the renpy-visual-editor directory
  // In production, return the app resources path
  if (process.env.VITE_DEV_SERVER_URL) {
    // __dirname is dist-electron/main, so go up 2 levels to get renpy-visual-editor root
    return join(__dirname, '../..')
  }
  return app.getAppPath()
})

// Dialog handlers for project management
ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Open Ren\'Py Project',
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  return result.filePaths[0]
})

ipcMain.handle('dialog:selectDirectory', async (_event, title: string) => {
  if (!mainWindow) return null
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: title || 'Select Directory',
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  return result.filePaths[0]
})

// Game launcher handlers
let gameProcess: import('child_process').ChildProcess | null = null

ipcMain.handle('game:launch', async (_event, projectPath: string, sdkPath: string) => {
  const { spawn } = await import('child_process')
  const path = await import('path')
  const fs = await import('fs/promises')
  
  // Determine the Ren'Py executable based on platform
  let renpyExe: string
  if (process.platform === 'win32') {
    renpyExe = path.join(sdkPath, 'renpy.exe')
  } else if (process.platform === 'darwin') {
    renpyExe = path.join(sdkPath, 'renpy.sh')
  } else {
    renpyExe = path.join(sdkPath, 'renpy.sh')
  }
  
  // Check if Ren'Py executable exists
  try {
    await fs.access(renpyExe)
  } catch {
    return {
      success: false,
      error: `Ren'Py executable not found at: ${renpyExe}`,
    }
  }
  
  // Check if project path exists
  try {
    await fs.access(projectPath)
  } catch {
    return {
      success: false,
      error: `Project path not found: ${projectPath}`,
    }
  }
  
  // Kill existing game process if running
  if (gameProcess && !gameProcess.killed) {
    gameProcess.kill()
    gameProcess = null
  }
  
  try {
    // Launch Ren'Py with the project path
    gameProcess = spawn(renpyExe, [projectPath], {
      detached: false,
      stdio: 'pipe',
    })
    
    // Handle process events
    gameProcess.on('error', (error) => {
      console.error('[game:launch] Process error:', error)
      if (mainWindow) {
        mainWindow.webContents.send('game:error', error.message)
      }
    })
    
    gameProcess.on('exit', (code) => {
      console.log('[game:launch] Process exited with code:', code)
      gameProcess = null
      if (mainWindow) {
        mainWindow.webContents.send('game:exit', code)
      }
    })
    
    // Capture stdout/stderr for debugging
    gameProcess.stdout?.on('data', (data) => {
      console.log('[game:stdout]', data.toString())
    })
    
    gameProcess.stderr?.on('data', (data) => {
      console.error('[game:stderr]', data.toString())
    })
    
    return {
      success: true,
      pid: gameProcess.pid,
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to launch game: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
})

ipcMain.handle('game:stop', async () => {
  if (gameProcess && !gameProcess.killed) {
    gameProcess.kill()
    gameProcess = null
    return { success: true }
  }
  return { success: false, error: 'No game process running' }
})

ipcMain.handle('game:isRunning', async () => {
  return gameProcess !== null && !gameProcess.killed
})

// Select image files for import
// Implements Requirements 3.3, 3.4, 3.10
ipcMain.handle('dialog:selectImages', async (_event, title?: string) => {
  if (!mainWindow) return null
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    title: title || 'Select Images to Import',
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  return result.filePaths
})

// Get file stats (for checking file size, mtime, etc.)
ipcMain.handle('fs:stat', async (_event, filePath: string) => {
  const fs = await import('fs/promises')
  try {
    const stats = await fs.stat(filePath)
    return {
      size: stats.size,
      mtime: stats.mtimeMs,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    }
  } catch {
    return null
  }
})

// Delete a file
ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
  const fs = await import('fs/promises')
  await fs.unlink(filePath)
})

// Show item in folder (file explorer)
ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
  const { shell } = await import('electron')
  shell.showItemInFolder(filePath)
})

// Select Ren'Py SDK path
ipcMain.handle('dialog:selectRenpySdk', async () => {
  if (!mainWindow) return null
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Ren\'Py SDK Directory',
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  // Verify it's a valid Ren'Py SDK by checking for renpy.exe or renpy.sh
  const path = await import('path')
  const fs = await import('fs/promises')
  const sdkPath = result.filePaths[0]
  
  const renpyExe = process.platform === 'win32' 
    ? path.join(sdkPath, 'renpy.exe')
    : path.join(sdkPath, 'renpy.sh')
  
  try {
    await fs.access(renpyExe)
    return sdkPath
  } catch {
    // Not a valid SDK
    return null
  }
})
