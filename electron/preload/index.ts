import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
  readDir: (path: string) => ipcRenderer.invoke('fs:readDir', path),
  exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
  mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
})

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      readFile: (path: string) => Promise<string>
      writeFile: (path: string, content: string) => Promise<void>
      readDir: (path: string) => Promise<{ name: string; isDirectory: () => boolean }[]>
      exists: (path: string) => Promise<boolean>
      mkdir: (path: string) => Promise<void>
    }
  }
}
