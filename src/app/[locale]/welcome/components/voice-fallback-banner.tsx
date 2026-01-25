import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export function VoiceFallbackBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-16 left-0 right-0 z-40 px-4 py-2 bg-amber-50 dark:bg-amber-900/50 border-b border-amber-200 dark:border-amber-800"
    >
      <div className="max-w-2xl mx-auto flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <p>
          <strong>Modalità Fallback:</strong> Azure Realtime API non disponibile.
          Melissa usa Web Speech API del browser (voce sintetica, no conversazione).
        </p>
      </div>
    </motion.div>
  );
}

