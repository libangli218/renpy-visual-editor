/**
 * App Configuration Pure Functions
 * 
 * Pure functions for application configuration logic.
 * These functions are testable without electron-store dependency.
 * 
 * Requirements: 1.5, 1.6
 */

/**
 * Schema for application configuration
 */
export interface AppConfigSchema {
  recentProjects: string[]  // Max 5 items
  sdkPath: string | null
}

/**
 * Maximum number of recent projects to store
 */
export const MAX_RECENT_PROJECTS = 5

/**
 * Default configuration values
 */
export const defaults: AppConfigSchema = {
  recentProjects: [],
  sdkPath: null
}

/**
 * Pure function to add a project to the recent projects list
 * - Moves project to front if already exists
 * - Limits list to MAX_RECENT_PROJECTS items
 * @param currentProjects - Current list of recent projects
 * @param projectPath - Path to the project to add
 * @returns Updated list of recent projects
 */
export function addRecentProjectPure(currentProjects: string[], projectPath: string): string[] {
  // Remove if already exists (to move to front)
  const filtered = currentProjects.filter(p => p !== projectPath)
  
  // Add to front
  filtered.unshift(projectPath)
  
  // Limit to max items
  return filtered.slice(0, MAX_RECENT_PROJECTS)
}

/**
 * Pure function to remove a project from the recent projects list
 * @param currentProjects - Current list of recent projects
 * @param projectPath - Path to the project to remove
 * @returns Updated list of recent projects
 */
export function removeRecentProjectPure(currentProjects: string[], projectPath: string): string[] {
  return currentProjects.filter(p => p !== projectPath)
}
