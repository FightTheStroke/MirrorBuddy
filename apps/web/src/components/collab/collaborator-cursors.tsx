'use client';

// ============================================================================
// COLLABORATOR CURSORS COMPONENT
// Renders other users' cursors on the mindmap canvas
// Part of Phase 8: Multi-User Collaboration
// ============================================================================

import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CursorData {
  x: number;
  y: number;
  name: string;
  color: string;
}

interface CollaboratorCursorsProps {
  cursors: Map<string, CursorData>;
  containerRef?: React.RefObject<HTMLElement>;
}

/**
 * Renders animated cursors for all collaborators
 */
export const CollaboratorCursors = memo(function CollaboratorCursors({
  cursors,
}: CollaboratorCursorsProps) {
  const cursorEntries = Array.from(cursors.entries());

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      aria-hidden="true"
    >
      <AnimatePresence>
        {cursorEntries.map(([userId, cursor]) => (
          <CollaboratorCursor
            key={userId}
            userId={userId}
            x={cursor.x}
            y={cursor.y}
            name={cursor.name}
            color={cursor.color}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

interface CollaboratorCursorProps {
  userId: string;
  x: number;
  y: number;
  name: string;
  color: string;
}

const CollaboratorCursor = memo(function CollaboratorCursor({
  x,
  y,
  name,
  color,
}: CollaboratorCursorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor pointer */}
      <motion.svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        animate={{ x: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.91a.5.5 0 0 0-.85.3Z"
          fill={color}
          stroke="#fff"
          strokeWidth="1.5"
        />
      </motion.svg>

      {/* Name label */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="ml-4 mt-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white shadow-md"
        style={{ backgroundColor: color }}
      >
        {name}
      </motion.div>
    </motion.div>
  );
});

export default CollaboratorCursors;
