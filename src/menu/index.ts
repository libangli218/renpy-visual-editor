/**
 * Menu Module
 * 
 * Exports menu-related functionality for the renderer process.
 */

export {
  registerMenuEventHandlers,
  unregisterMenuEventHandlers,
  updateMenuEventCallbacks,
  syncMenuState,
  syncMenuStateWithPanels,
  getCurrentMenuState,
  type MenuEventCallbacks,
} from './menuEventHandler'
