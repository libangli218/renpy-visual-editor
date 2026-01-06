import { CanvasTransform, Point, Rect, MIN_SCALE, MAX_SCALE } from './canvasLayoutStore'

/**
 * Convert screen coordinates to canvas coordinates
 * 
 * Screen coordinates are relative to the viewport (what the user sees)
 * Canvas coordinates are the actual position on the infinite canvas
 * 
 * Formula: canvasPos = (screenPos - offset) / scale
 * 
 * @param screenX - X coordinate in screen space
 * @param screenY - Y coordinate in screen space
 * @param transform - Current canvas transform
 * @returns Point in canvas coordinates
 * 
 * Requirements: 3.1
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  transform: CanvasTransform
): Point {
  return {
    x: (screenX - transform.offsetX) / transform.scale,
    y: (screenY - transform.offsetY) / transform.scale,
  }
}

/**
 * Convert canvas coordinates to screen coordinates
 * 
 * Canvas coordinates are the actual position on the infinite canvas
 * Screen coordinates are relative to the viewport (what the user sees)
 * 
 * Formula: screenPos = canvasPos * scale + offset
 * 
 * @param canvasX - X coordinate in canvas space
 * @param canvasY - Y coordinate in canvas space
 * @param transform - Current canvas transform
 * @returns Point in screen coordinates
 * 
 * Requirements: 3.1
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  transform: CanvasTransform
): Point {
  return {
    x: canvasX * transform.scale + transform.offsetX,
    y: canvasY * transform.scale + transform.offsetY,
  }
}

/**
 * Calculate new transform for zooming at a specific point
 * 
 * The point under the mouse should remain stationary after zoom.
 * This creates a natural zoom experience where you zoom "into" or "out of"
 * the point you're looking at.
 * 
 * @param transform - Current canvas transform
 * @param newScale - Desired new scale (will be clamped to valid range)
 * @param mouseX - Mouse X position in screen coordinates
 * @param mouseY - Mouse Y position in screen coordinates
 * @returns New canvas transform with zoom applied
 * 
 * Requirements: 3.1
 */
export function zoomAtPoint(
  transform: CanvasTransform,
  newScale: number,
  mouseX: number,
  mouseY: number
): CanvasTransform {
  // Clamp scale to valid range
  const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale))
  
  // Calculate the canvas position under the mouse before zoom
  const canvasX = (mouseX - transform.offsetX) / transform.scale
  const canvasY = (mouseY - transform.offsetY) / transform.scale
  
  // Calculate new offset to keep the same canvas point under the mouse
  const newOffsetX = mouseX - canvasX * clampedScale
  const newOffsetY = mouseY - canvasY * clampedScale
  
  return {
    offsetX: newOffsetX,
    offsetY: newOffsetY,
    scale: clampedScale,
  }
}

/**
 * Convert a screen rectangle to canvas coordinates
 * 
 * @param screenRect - Rectangle in screen coordinates
 * @param transform - Current canvas transform
 * @returns Rectangle in canvas coordinates
 */
export function screenRectToCanvas(
  screenRect: Rect,
  transform: CanvasTransform
): Rect {
  const topLeft = screenToCanvas(screenRect.x, screenRect.y, transform)
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: screenRect.width / transform.scale,
    height: screenRect.height / transform.scale,
  }
}

/**
 * Convert a canvas rectangle to screen coordinates
 * 
 * @param canvasRect - Rectangle in canvas coordinates
 * @param transform - Current canvas transform
 * @returns Rectangle in screen coordinates
 */
export function canvasRectToScreen(
  canvasRect: Rect,
  transform: CanvasTransform
): Rect {
  const topLeft = canvasToScreen(canvasRect.x, canvasRect.y, transform)
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: canvasRect.width * transform.scale,
    height: canvasRect.height * transform.scale,
  }
}

/**
 * Check if a point is inside a rectangle
 * 
 * @param point - Point to check
 * @param rect - Rectangle to check against
 * @returns true if point is inside rectangle
 */
export function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

/**
 * Check if two rectangles intersect
 * 
 * @param rect1 - First rectangle
 * @param rect2 - Second rectangle
 * @returns true if rectangles intersect
 */
export function doRectsIntersect(rect1: Rect, rect2: Rect): boolean {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  )
}

/**
 * Calculate the bounding box of multiple rectangles
 * 
 * @param rects - Array of rectangles
 * @returns Bounding box containing all rectangles, or null if empty
 */
export function getBoundingBox(rects: Rect[]): Rect | null {
  if (rects.length === 0) {
    return null
  }
  
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  
  for (const rect of rects) {
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Calculate the center point of a rectangle
 * 
 * @param rect - Rectangle
 * @returns Center point
 */
export function getRectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  }
}

/**
 * Calculate distance between two points
 * 
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Euclidean distance
 */
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Clamp a value between min and max
 * 
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Calculate transform to fit content in viewport
 * 
 * @param contentBounds - Bounding box of content to fit
 * @param viewportWidth - Width of viewport
 * @param viewportHeight - Height of viewport
 * @param padding - Padding around content
 * @returns Transform that fits content in viewport
 */
export function calculateFitTransform(
  contentBounds: Rect,
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 50
): CanvasTransform {
  // Calculate scale to fit content with padding
  const availableWidth = viewportWidth - padding * 2
  const availableHeight = viewportHeight - padding * 2
  
  const scaleX = availableWidth / contentBounds.width
  const scaleY = availableHeight / contentBounds.height
  const scale = clamp(Math.min(scaleX, scaleY), MIN_SCALE, MAX_SCALE)
  
  // Calculate offset to center content
  const contentCenter = getRectCenter(contentBounds)
  const offsetX = viewportWidth / 2 - contentCenter.x * scale
  const offsetY = viewportHeight / 2 - contentCenter.y * scale
  
  return {
    offsetX,
    offsetY,
    scale,
  }
}
