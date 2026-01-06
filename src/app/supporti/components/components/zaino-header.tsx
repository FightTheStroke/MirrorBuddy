/**
 * @file zaino-header.tsx
 * @brief Zaino header component
 */

import { motion } from 'framer-motion';
import { Backpack } from 'lucide-react';

export function ZainoHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6 text-center"
    >
      <div className="flex items-center justify-center gap-3">
        <Backpack className="w-8 h-8 text-primary" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Il Tuo Zaino
        </h1>
      </div>
    </motion.div>
  );
}

