'use client';

import { motion } from 'framer-motion';
import { RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Rating } from '@/types';

interface CompletionScreenProps {
  cardsReviewed: number;
  ratings: Record<string, Rating>;
  onRestart: () => void;
}

export function FlashcardCompletion({
  cardsReviewed,
  ratings,
  onRestart,
}: CompletionScreenProps) {
  const stats = {
    easy: Object.values(ratings).filter(r => r === 'easy').length,
    good: Object.values(ratings).filter(r => r === 'good').length,
    hard: Object.values(ratings).filter(r => r === 'hard').length,
    again: Object.values(ratings).filter(r => r === 'again').length,
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-6"
          >
            <Check className="w-10 h-10 text-green-400" />
          </motion.div>

          <h2 className="text-2xl font-bold text-white mb-2">Sessione Completata!</h2>
          <p className="text-white/70 mb-8">
            Hai rivisto tutte le {cardsReviewed} carte.
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            <div className="bg-blue-500/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-400">{stats.easy}</div>
              <div className="text-xs text-white/60">Facile</div>
            </div>
            <div className="bg-green-500/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-400">{stats.good}</div>
              <div className="text-xs text-white/60">Bene</div>
            </div>
            <div className="bg-orange-500/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-400">{stats.hard}</div>
              <div className="text-xs text-white/60">Difficile</div>
            </div>
            <div className="bg-red-500/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-400">{stats.again}</div>
              <div className="text-xs text-white/60">Ripeti</div>
            </div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-purple-300">
              <strong>Algoritmo FSRS:</strong> In modalita completa, le carte verrebbero programmate
              automaticamente per la ripetizione ottimale basata sulle tue risposte.
            </p>
          </div>

          <Button
            onClick={onRestart}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Ricomincia
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
