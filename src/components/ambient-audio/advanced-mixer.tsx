'use client';

import { useState } from 'react';
import { Trash2, Plus, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { AUDIO_MODES } from './constants';
import type { AudioMode, AudioLayer } from '@/types';

interface AdvancedMixerProps {
  layers: AudioLayer[];
  selectedMode: AudioMode;
  onModeSelect: (mode: AudioMode) => void;
  onAddLayer: () => void;
  onRemoveLayer: (id: string) => void;
  onLayerVolumeChange: (id: string, volume: number) => void;
  onClearLayers: () => void;
}

export function AdvancedMixer({
  layers,
  selectedMode,
  onModeSelect,
  onAddLayer,
  onRemoveLayer,
  onLayerVolumeChange,
  onClearLayers,
}: AdvancedMixerProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const noiseModesData = AUDIO_MODES.filter(m => m.category === 'noise');
  const binauralModesData = AUDIO_MODES.filter(m => m.category === 'binaural');
  const ambientModesData = AUDIO_MODES.filter(m => m.category === 'ambient');

  if (!showAdvanced) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Mixer Avanzato</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(true)}
            >
              Mostra
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Mixer Avanzato</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(false)}
          >
            Nascondi
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {layers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Layer Attivi ({layers.length})
            </h4>
            {layers.map((layer) => {
              const modeData = AUDIO_MODES.find(m => m.mode === layer.mode);
              return (
                <div key={layer.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <span className="text-lg">{modeData?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{modeData?.label}</div>
                    <Slider
                      value={[layer.volume * 100]}
                      onValueChange={(values) => onLayerVolumeChange(layer.id, values[0] / 100)}
                      max={100}
                      step={1}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveLayer(layer.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Aggiungi Layer</h4>

          <div className="space-y-1">
            <p className="text-xs text-slate-600 dark:text-slate-400">Rumore</p>
            <div className="grid grid-cols-3 gap-1">
              {noiseModesData.map((m) => (
                <Button
                  key={m.mode}
                  size="sm"
                  variant={selectedMode === m.mode ? 'default' : 'outline'}
                  onClick={() => onModeSelect(m.mode)}
                  className="text-xs"
                >
                  {m.icon} {m.label.split(' ')[1]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-600 dark:text-slate-400">Binaural Beats</p>
            <div className="grid grid-cols-3 gap-1">
              {binauralModesData.map((m) => (
                <Button
                  key={m.mode}
                  size="sm"
                  variant={selectedMode === m.mode ? 'default' : 'outline'}
                  onClick={() => onModeSelect(m.mode)}
                  className="text-xs"
                >
                  {m.icon} {m.label.split(' ')[0]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Suoni Ambientali <span className="text-xs text-amber-600">(Prossimamente)</span>
            </p>
            <div className="grid grid-cols-4 gap-1">
              {ambientModesData.map((m) => (
                <Button
                  key={m.mode}
                  size="sm"
                  variant="outline"
                  disabled
                  className="text-xs opacity-50"
                >
                  {m.icon}
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={onAddLayer} className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Layer
          </Button>
        </div>

        {layers.length > 0 && (
          <Button
            onClick={onClearLayers}
            variant="outline"
            className="w-full text-red-600 hover:text-red-700"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Rimuovi Tutti i Layer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
