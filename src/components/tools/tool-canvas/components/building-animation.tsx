/**
 * Building animation component
 */

'use client';

import { motion } from 'framer-motion';
import type { ToolType } from '@/lib/realtime/tool-events';
import { renderToolIcon } from '../constants';

interface BuildingAnimationProps {
  toolType: ToolType;
}

export function BuildingAnimation({ toolType }: BuildingAnimationProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.1, 1],
        rotate: [0, 5, -5, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="text-blue-500"
    >
      {renderToolIcon(toolType, 'w-8 h-8')}
    </motion.div>
  );
}
