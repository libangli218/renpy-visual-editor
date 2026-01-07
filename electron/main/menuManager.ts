/**
 * Menu Manager Module
 * 
 * Manages the Electron native menu bar for the application.
 * Handles menu creation, state updates, and IPC communication.
 * 
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 8.1, 8.2, 8.3
 */

import { Menu, BrowserWindow, ipcMain, MenuItemConstructorOptions } from 'electron'
import { existsSync } from 'fs'
import { getRecentProjects, addRecentProject, clearRecentProjects, removeRecentProject } from './appConfig'
import type { MenuState } from './menuManager.pure'
import { 
  defaultMenuState, 
  shouldEnableMenuItem 
} from './menuManager.pure'

// Re-export types and functions for external use
export type { MenuState }
export { defaultMenuState, shouldEnableMenuItem }

/**
 * Menu Manager class
 * Handles menu creation and state management
 */
export class MenuManager {
  private mainWindow: BrowserWindow | null = null
  private currentState: MenuState = { ...defaultMenuState }

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.registerIpcHandlers()
    this.createMenu()
  }

  /**
   * Register IPC handlers for menu state synchronization
   */
  private registerIpcHandlers(): void {
    // Handle menu state updates from renderer
    ipcMain.on('menu:updateState', (_event, newState: Partial<MenuState>) => {
      this.updateState(newState)
    })

    // Handle request for recent projects
    ipcMain.handle('menu:getRecentProjects', () => {
      return getRecentProjects()
    })

    // Handle adding a recent project
    ipcMain.handle('menu:addRecentProject', (_event, projectPath: string) => {
      addRecentProject(projectPath)
      this.createMenu() // Rebuild menu to update recent projects
    })

    // Handle clearing recent projects
    ipcMain.handle('menu:clearRecentProjects', () => {
      clearRecentProjects()
      this.createMenu()
    })
  }

  /**
   * Send a menu action to the renderer process
   */
  private sendMenuAction(action: string, payload?: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('menu:action', { action, payload })
    }
  }

  /**
   * Build the recent projects submenu
   * Filters out projects that no longer exist on disk
   */
  private buildRecentProjectsSubmenu(): MenuItemConstructorOptions[] {
    const recentProjects = getRecentProjects()
    
    // Filter out projects that no longer exist
    const existingProjects: string[] = []
    const removedProjects: string[] = []
    
    for (const projectPath of recentProjects) {
      if (existsSync(projectPath)) {
        existingProjects.push(projectPath)
      } else {
        removedProjects.push(projectPath)
      }
    }
    
    // Remove non-existing projects from the stored list
    for (const projectPath of removedProjects) {
      removeRecentProject(projectPath)
    }
    
    if (existingProjects.length === 0) {
      return [
        {
          label: 'No Recent Projects',
          enabled: false
        }
      ]
    }

    const items: MenuItemConstructorOptions[] = existingProjects.map((projectPath) => ({
      label: projectPath,
      click: () => this.sendMenuAction('openRecentProject', projectPath)
    }))

    // Add separator and clear option
    items.push(
      { type: 'separator' },
      {
        label: 'Clear Recent Projects',
        click: () => {
          clearRecentProjects()
          this.createMenu()
        }
      }
    )

    return items
  }

  /**
   * Create the application menu
   * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1
   */
  createMenu(): void {
    const template: MenuItemConstructorOptions[] = [
      // File Menu - Requirement 1.1
      {
        label: 'File',
        submenu: [
          {
            label: 'New Project',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.sendMenuAction('newProject')
          },
          {
            label: 'Open Project',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.sendMenuAction('openProject')
          },
          {
            label: 'Open Recent',
            submenu: this.buildRecentProjectsSubmenu()
          },
          { type: 'separator' },
          {
            label: 'Save',
            accelerator: 'CmdOrCtrl+S',
            enabled: shouldEnableMenuItem('save', this.currentState),
            click: () => this.sendMenuAction('save')
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: 'Alt+F4',
            role: 'quit'
          }
        ]
      },
      // Edit Menu - Requirement 2.1
      {
        label: 'Edit',
        submenu: [
          {
            label: 'Undo',
            accelerator: 'CmdOrCtrl+Z',
            enabled: shouldEnableMenuItem('undo', this.currentState),
            click: () => this.sendMenuAction('undo')
          },
          {
            label: 'Redo',
            accelerator: 'CmdOrCtrl+Y',
            enabled: shouldEnableMenuItem('redo', this.currentState),
            click: () => this.sendMenuAction('redo')
          }
        ]
      },
      // View Menu - Requirement 3.1
      {
        label: 'View',
        submenu: [
          {
            label: 'Story Mode',
            type: 'radio',
            checked: this.currentState.currentMode === 'story',
            click: () => this.sendMenuAction('setViewMode', 'story')
          },
          {
            label: 'Multi-Label Mode',
            type: 'radio',
            checked: this.currentState.currentMode === 'multi-label',
            click: () => this.sendMenuAction('setViewMode', 'multi-label')
          },
          { type: 'separator' },
          {
            label: 'Toggle Preview Panel',
            type: 'checkbox',
            checked: this.currentState.previewVisible,
            click: () => this.sendMenuAction('togglePreviewPanel')
          },
          {
            label: 'Toggle Properties Panel',
            type: 'checkbox',
            checked: this.currentState.propertiesVisible,
            click: () => this.sendMenuAction('togglePropertiesPanel')
          }
        ]
      },
      // Project Menu - Requirement 4.1
      {
        label: 'Project',
        submenu: [
          {
            label: 'Run Game',
            accelerator: 'F5',
            enabled: shouldEnableMenuItem('runGame', this.currentState),
            click: () => this.sendMenuAction('runGame')
          },
          {
            label: 'Stop Game',
            accelerator: 'Shift+F5',
            enabled: shouldEnableMenuItem('stopGame', this.currentState),
            click: () => this.sendMenuAction('stopGame')
          },
          { type: 'separator' },
          {
            label: 'Project Settings...',
            enabled: shouldEnableMenuItem('projectSettings', this.currentState),
            click: () => this.sendMenuAction('openProjectSettings')
          },
          {
            label: 'Configure SDK...',
            click: () => this.sendMenuAction('configureSdk')
          }
        ]
      },
      // Help Menu - Requirement 5.1
      {
        label: 'Help',
        submenu: [
          {
            label: 'Keyboard Shortcuts',
            accelerator: 'CmdOrCtrl+/',
            click: () => this.sendMenuAction('showKeyboardShortcuts')
          },
          { type: 'separator' },
          {
            label: 'About',
            click: () => this.sendMenuAction('showAbout')
          }
        ]
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  /**
   * Update the menu state and rebuild the menu
   * Requirements: 8.1, 8.2, 8.3
   */
  updateState(newState: Partial<MenuState>): void {
    this.currentState = { ...this.currentState, ...newState }
    this.createMenu()
  }

  /**
   * Get the current menu state
   */
  getState(): MenuState {
    return { ...this.currentState }
  }
}

