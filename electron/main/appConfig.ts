/**
 * App Configuration Module
 * 
 * Uses electron-store for persistent storage of application configuration.
 * Manages recent projects list and SDK path.
 * 
 * Requirements: 1.5, 1.6
 */

import Store from 'electron-store'
import type { AppConfigSchema } from './appConfig.pure'
import {
  MAX_RECENT_PROJECTS,
  defaults,
  addRecentProjectPure,
  removeRecentProjectPure
} from './appConfig.pure'

// Re-export types and constants
export type { AppConfigSchema }
export { MAX_RECENT_PROJECTS, addRecentProjectPure, removeRecentProjectPure }

/**
 * Electron store instance for persistent configuration
 */
const store = new Store<AppConfigSchema>({
  name: 'app-config',
  defaults
})

/**
 * Get the list of recent projects
 * @returns Array of recent project paths (max 5)
 */
export function getRecentProjects(): string[] {
  return store.get('recentProjects', [])
}

/**
 * Add a project to the recent projects list
 * - Moves project to front if already exists
 * - Limits list to MAX_RECENT_PROJECTS items
 * @param projectPath - Path to the project to add
 */
export function addRecentProject(projectPath: string): void {
  const recentProjects = getRecentProjects()
  const updated = addRecentProjectPure(recentProjects, projectPath)
  store.set('recentProjects', updated)
}

/**
 * Remove a project from the recent projects list
 * @param projectPath - Path to the project to remove
 */
export function removeRecentProject(projectPath: string): void {
  const recentProjects = getRecentProjects()
  const updated = removeRecentProjectPure(recentProjects, projectPath)
  store.set('recentProjects', updated)
}

/**
 * Clear all recent projects
 */
export function clearRecentProjects(): void {
  store.set('recentProjects', [])
}

/**
 * Get the configured SDK path
 * @returns SDK path or null if not configured
 */
export function getSdkPath(): string | null {
  return store.get('sdkPath', null)
}

/**
 * Set the SDK path
 * @param sdkPath - Path to the Ren'Py SDK, or null to clear
 */
export function setSdkPath(sdkPath: string | null): void {
  store.set('sdkPath', sdkPath)
}

/**
 * Export the store for testing purposes
 */
export { store }
