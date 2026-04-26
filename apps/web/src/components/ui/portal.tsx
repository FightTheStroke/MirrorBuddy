'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  /** Target element ID. Defaults to creating a portal at document.body */
  containerId?: string;
}

// Subscribe function for useSyncExternalStore (no-op for hydration check)
const subscribe = () => () => {};

// Snapshot functions for client/server
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Portal component for rendering children outside the DOM hierarchy.
 *
 * Essential for modals, dialogs, and overlays that need to:
 * - Escape parent overflow:hidden
 * - Escape parent transform (which breaks position:fixed)
 * - Render at the top of the z-index stacking context
 *
 * @example
 * ```tsx
 * <Portal>
 *   <div className="fixed inset-0 z-50">
 *     Modal content here
 *   </div>
 * </Portal>
 * ```
 */
export function Portal({ children, containerId }: PortalProps) {
  // Use useSyncExternalStore for hydration-safe client detection
  const isClient = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isClient) {
    return null;
  }

  // Get or create container
  let container: HTMLElement | null = null;

  if (containerId) {
    container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }
  } else {
    container = document.body;
  }

  return createPortal(children, container);
}
