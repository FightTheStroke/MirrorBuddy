import { motion } from 'framer-motion';
import { Loader2, Network, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import type { LiveStatus } from '../types';

interface StatusIndicatorProps {
  status: LiveStatus;
  nodeCount: number;
  progress: number;
  error: string | null;
}

export function StatusIndicator({ status, nodeCount, progress, error }: StatusIndicatorProps) {
  switch (status) {
    case 'connecting':
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-blue-500"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Connessione in corso...</span>
        </motion.div>
      );
    case 'waiting':
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-amber-500"
        >
          <Network className="w-4 h-4" />
          <span className="text-sm">In attesa del Professore...</span>
        </motion.div>
      );
    case 'building':
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-emerald-500"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="text-sm">
            Costruendo... {nodeCount} nodi ({progress}%)
          </span>
        </motion.div>
      );
    case 'complete':
      return (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2 text-emerald-600"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm">Completata! {nodeCount} nodi</span>
        </motion.div>
      );
    case 'error':
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-red-500"
        >
          <XCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </motion.div>
      );
    default:
      return null;
  }
}

