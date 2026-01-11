/**
 * Typing indicator component
 */

import { motion } from 'framer-motion';

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <motion.span
        className="w-2 h-2 bg-white/60 rounded-full"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className="w-2 h-2 bg-white/60 rounded-full"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      />
      <motion.span
        className="w-2 h-2 bg-white/60 rounded-full"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  );
}
