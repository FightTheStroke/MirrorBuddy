/**
 * Profile cards component
 */

'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCESSIBILITY_PROFILES } from '../profiles';

interface ProfileCardsProps {
  activeProfile: string | null;
  onProfileSelect: (profileId: string) => void;
}

export function ProfileCards({ activeProfile, onProfileSelect }: ProfileCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {ACCESSIBILITY_PROFILES.map((profile, index) => {
        const Icon = profile.icon;
        const isActive = activeProfile === profile.id;

        return (
          <motion.button
            key={profile.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onProfileSelect(profile.id)}
            className={cn(
              'relative p-4 rounded-xl border text-center transition-all duration-200',
              isActive
                ? 'bg-white/20 border-white/50 ring-2 ring-white/30'
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
            )}
          >
            {isActive && (
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}

            <div
              className={cn(
                'w-10 h-10 mx-auto rounded-lg bg-gradient-to-br flex items-center justify-center mb-2',
                profile.color
              )}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>

            <span className="text-xs font-medium text-white/90 block">
              {profile.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
