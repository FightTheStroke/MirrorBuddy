'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music } from 'lucide-react';
import { AmbientAudioControl } from '@/components/ambient-audio/ambient-audio-control';

/**
 * Ambient Audio settings section
 * Provides controls for focus music, binaural beats, and ambient soundscapes
 */
export function AmbientAudioSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-500" />
            Audio Ambientale per lo Studio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            L&apos;audio ambientale può migliorare la concentrazione e l&apos;efficacia dello studio. 
            Scegli tra rumore bianco, binaural beats per diverse modalità di focus, 
            o soundscapes naturali per creare l&apos;ambiente perfetto per il tuo apprendimento.
          </p>
        </CardContent>
      </Card>

      <AmbientAudioControl />
    </div>
  );
}
