/**
 * Menu Manager Pure Functions
 * 
 * Pure functions for menu state logic.
 * These functions are testable without Electron dependency.
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

/**
 * Menu state interface representing the current application state
 * Used to enable/disable menu items based on app state
 */
export interface MenuState {
  projectOpen: boolean
  gameRunning: boolean
  canUndo: boolean
  canRedo: boolean
  currentMode: 'story' | 'multi-label'
  previewVisible: boolean
  propertiesVisible: boolean
}

/**
 * Default menu state when no project is open
 */
export const defaultMenuState: MenuState = {
  projectOpen: false,
  gameRunning: false,
  canUndo: false,
  canRedo: false,
  currentMode: 'story',
  previewVisible: true,
  propertiesVisible: true
}

/**
 * Menu items that can be enabled/disabled based on state
 */
export type StateDependentMenuItem = 
  | 'save' 
  | 'runGame' 
  | 'stopGame' 
  | 'projectSettings' 
  | 'undo' 
  | 'redo'

/**
 * Pure function to determine if a menu item should be enabled based on state
 * 
 * Requirements:
 * - 8.1: When no project is open, disable: Save, Run Game, Stop Game, Project Settings
 * - 8.2: When game is running, Run Game disabled, Stop Game enabled
 * - 8.3: When game is not running, Stop Game disabled
 * - 2.4: When nothing to undo, Undo disabled
 * - 2.5: When nothing to redo, Redo disabled
 * 
 * @param menuItem - The menu item to check
 * @param state - The current application state
 * @returns Whether the menu item should be enabled
 */
export function shouldEnableMenuItem(
  menuItem: StateDependentMenuItem,
  state: MenuState
): boolean {
  switch (menuItem) {
    case 'save':
      // Requirement 8.1: Disabled when no project is open
      return state.projectOpen
    
    case 'projectSettings':
      // Requirement 8.1: Disabled when no project is open
      return state.projectOpen
    
    case 'runGame':
      // Requirement 8.1: Disabled when no project is open
      // Requirement 8.2: Disabled when game is running
      return state.projectOpen && !state.gameRunning
    
    case 'stopGame':
      // Requirement 8.3: Disabled when game is not running
      return state.gameRunning
    
    case 'undo':
      // Requirement 2.4: Disabled when nothing to undo
      return state.canUndo
    
    case 'redo':
      // Requirement 2.5: Disabled when nothing to redo
      return state.canRedo
    
    default:
      return true
  }
}

/**
 * Get all state-dependent menu items
 */
export function getAllStateDependentMenuItems(): StateDependentMenuItem[] {
  return ['save', 'runGame', 'stopGame', 'projectSettings', 'undo', 'redo']
}

/**
 * Pure function to compute the enabled state of all menu items
 * 
 * @param state - The current application state
 * @returns Object mapping menu items to their enabled state
 */
export function computeMenuItemStates(state: MenuState): Record<StateDependentMenuItem, boolean> {
  return {
    save: shouldEnableMenuItem('save', state),
    runGame: shouldEnableMenuItem('runGame', state),
    stopGame: shouldEnableMenuItem('stopGame', state),
    projectSettings: shouldEnableMenuItem('projectSettings', state),
    undo: shouldEnableMenuItem('undo', state),
    redo: shouldEnableMenuItem('redo', state)
  }
}

/**
 * Pure function to determine which view mode should have a checkmark
 * 
 * Requirement 3.3: Current view mode indicated with checkmark
 * 
 * @param state - The current application state
 * @returns The mode that should have a checkmark
 */
export function getCheckedViewMode(state: MenuState): 'story' | 'multi-label' {
  return state.currentMode
}

/**
 * Pure function to determine panel toggle checkmark states
 * 
 * Requirement 3.5: Toggle items show checkmarks when panels are visible
 * 
 * @param state - The current application state
 * @returns Object with panel visibility states
 */
export function getPanelCheckmarks(state: MenuState): { preview: boolean; properties: boolean } {
  return {
    preview: state.previewVisible,
    properties: state.propertiesVisible
  }
}

