/**
 * Swipe gesture utilities for flashcard review
 * Handles detection and classification of swipe gestures
 */

export interface SwipeState {
  startX: number;
  currentX: number;
  isDragging: boolean;
  direction: "left" | "right" | null;
}

export const SWIPE_THRESHOLD = 50;

/**
 * Detects if a touch event constitutes a valid swipe
 * Only treats as swipe if horizontal movement is significantly larger than vertical
 * and horizontal movement exceeds SWIPE_THRESHOLD
 */
export function detectSwipe(
  startX: number,
  endX: number,
  startY: number,
  endY: number,
): "left" | "right" | null {
  const deltaX = Math.abs(endX - startX);
  const deltaY = Math.abs(endY - startY);

  if (deltaX > deltaY && deltaX > SWIPE_THRESHOLD) {
    return endX < startX ? "left" : "right";
  }

  return null;
}

/**
 * Calculates swipe feedback opacity for visual feedback
 */
export function calculateSwipeOpacity(swipeDelta: number): number {
  return Math.abs(swipeDelta) > 50
    ? Math.min(1, Math.abs(swipeDelta) / 150)
    : 0;
}

/**
 * Resets swipe state to initial state
 */
export function resetSwipeState(): SwipeState {
  return {
    startX: 0,
    currentX: 0,
    isDragging: false,
    direction: null,
  };
}
