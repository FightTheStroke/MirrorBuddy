/**
 * Planet info modal component
 */

'use client';

import { motion } from 'framer-motion';
import { X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Planet } from '../data/planets';

interface PlanetInfoModalProps {
  planet: Planet;
  onClose: () => void;
}

export function PlanetInfoModal({ planet, onClose }: PlanetInfoModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <Card className="bg-slate-900/90 border-white/20 w-[400px] max-w-[90vw]">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full"
                  style={{
                    backgroundColor: planet.color,
                    boxShadow: planet.glow
                      ? `0 0 30px ${planet.color}`
                      : 'none',
                  }}
                />
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {planet.nameIt}
                  </h2>
                  <p className="text-white/60 text-sm">{planet.name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <p className="text-white/80 mb-4">{planet.description}</p>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
                Fatti interessanti
              </h3>
              <ul className="space-y-1">
                {planet.facts.map((fact, i) => (
                  <li key={i} className="text-white/70 text-sm flex items-center gap-2">
                    <Info className="w-3 h-3 text-purple-400" />
                    {fact}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-xs text-purple-300">
                In modalita completa, i Professori potrebbero spiegarti molto di piu su ogni pianeta!
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
