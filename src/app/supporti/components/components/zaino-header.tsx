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
      className="mb-8 text-center"
    >
      <div className="flex items-center justify-center gap-3 mb-4">
        <Backpack className="w-10 h-10 text-primary" aria-hidden="true" />
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
          Il Tuo Zaino
        </h1>
      </div>
      <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
        Tutti i materiali che hai creato con i Maestri. Cerca, filtra e ritrova i
        tuoi contenuti.
      </p>
    </motion.div>
  );
}

