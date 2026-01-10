/**
 * Connection status overlay component
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, XCircle } from 'lucide-react';

interface ConnectionOverlayProps {
  connectionState: 'connected' | 'connecting' | 'reconnecting' | 'error' | 'disconnected';
}

export function ConnectionOverlay({ connectionState }: ConnectionOverlayProps) {
  return (
    <AnimatePresence>
      {connectionState !== 'connected' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
        >
          <div className="text-center space-y-4">
            {connectionState === 'connecting' && (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                <p className="text-slate-400">Connessione in corso...</p>
              </>
            )}
            {connectionState === 'reconnecting' && (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500 mx-auto" />
                <p className="text-slate-400">Riconnessione...</p>
              </>
            )}
            {connectionState === 'error' && (
              <>
                <XCircle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-slate-400">Connessione fallita</p>
              </>
            )}
            {connectionState === 'disconnected' && (
              <>
                <div className="w-8 h-8 rounded-full bg-slate-700 mx-auto" />
                <p className="text-slate-400">Disconnesso</p>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
