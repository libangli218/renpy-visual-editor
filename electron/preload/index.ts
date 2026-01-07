import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  readFileAsBase64: (path: string) => ipcRenderer.invoke('fs:readFileAsBase64', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  readDir: (path: string) => ipcRenderer.invoke('fs:readDir', path),
  exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
  mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
  copyDir: (src: string, dest: string) => ipcRenderer.invoke('fs:copyDir', src, dest),
  copyFile: (src: string, dest: string) => ipcRenderer.invoke('fs:copyFile', src, dest),
  getAppPath: () => ipcRenderer.invoke('fs:getAppPath'),
  
  // Dialog operations
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  selectDirectory: (title?: string) => ipcRenderer.invoke('dialog:selectDirectory', title),
  selectRenpySdk: () => ipcRenderer.invoke('dialog:selectRenpySdk'),
  
  // Game launcher operations
  launchGame: (projectPath: string, sdkPath: string) => ipcRenderer.invoke('game:launch', projectPath, sdkPath),
  stopGame: () => ipcRenderer.invoke('game:stop'),
  isGameRunning: () => ipcRenderer.invoke('game:isRunning'),
  
  // Game event listeners
  onGameError: (callback: (error: string) => void) => {
    ipcRenderer.on('game:error', (_event, error) => callback(error))
  },
  onGameExit: (callback: (code: number | null) => void) => {
    ipcRenderer.on('game:exit', (_event, code) => callback(code))
  },
  removeGameListeners: () => {
    ipcRenderer.removeAllListeners('game:error')
    ipcRenderer.removeAllListeners('game:exit')
  },
})

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      readFile: (path: string) => Promise<string>
      readFileAsBase64: (path: string) => Promise<string | null>
      writeFile: (path: string, content: string) => Promise<void>
      readDir: (path: string) => Promise<{ name: string; isDirectory: boolean }[]>
      exists: (path: string) => Promise<boolean>
      mkdir: (path: string) => Promise<void>
      copyDir: (src: string, dest: string) => Promise<void>
      copyFile: (src: string, dest: string) => Promise<void>
      getAppPath: () => Promise<string>
      openDirectory: () => Promise<string | null>
      selectDirectory: (title?: string) => Promise<string | null>
      selectRenpySdk: () => Promise<string | null>
      launchGame: (projectPath: string, sdkPath: string) => Promise<{ success: boolean; pid?: number; error?: string }>
      stopGame: () => Promise<{ success: boolean; error?: string }>
      isGameRunning: () => Promise<boolean>
      onGameError: (callback: (error: string) => void) => void
      onGameExit: (callback: (code: number | null) => void) => void
      removeGameListeners: () => void
    }
  }
}
