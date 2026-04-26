/**
 * @file quick-actions.tsx
 * @brief Quick actions component
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { QUICK_ACTIONS } from '../constants';

interface QuickActionsProps {
  onAction: (prompt: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap justify-center gap-2 pt-4"
    >
      {QUICK_ACTIONS.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          size="sm"
          onClick={() => onAction(action.prompt)}
          className="gap-2"
        >
          <action.icon className="w-4 h-4" />
          {action.label}
        </Button>
      ))}
    </motion.div>
  );
}

