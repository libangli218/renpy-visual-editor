/**
 * Hash Utilities
 * 
 * Fast hash computation for cache keys.
 * Uses a simple but effective hash algorithm (djb2 variant).
 */

/**
 * Compute a fast hash of a string
 * Uses djb2 algorithm - fast and good distribution
 * 
 * @param str - String to hash
 * @returns Hex string hash
 */
export function computeHash(str: string): string {
  let hash = 5381
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    // hash * 33 + char
    hash = ((hash << 5) + hash) + char
    // Keep it 32-bit
    hash = hash >>> 0
  }
  
  return hash.toString(16).padStart(8, '0')
}

/**
 * Estimate the memory size of an object
 * Uses JSON serialization as a rough estimate
 * 
 * @param obj - Object to estimate
 * @returns Estimated size in bytes
 */
export function estimateSize(obj: unknown): number {
  try {
    // JSON string length * 2 (UTF-16 chars)
    // This is a rough estimate but fast
    const jsonStr = JSON.stringify(obj)
    return jsonStr.length * 2
  } catch {
    // If serialization fails, return a default estimate
    return 1024
  }
}

/**
 * Format bytes to human readable string
 * 
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
