'use client';

import { useState } from 'react';
import { Volume2, VolumeX, Play, Pause, Square, Plus, Trash2, Music, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useAmbientAudio } from '@/lib/hooks/use-ambient-audio';
import type { AudioMode, AudioPreset } from '@/types';

const AUDIO_MODES: { mode: AudioMode; label: string; icon: string; category: string }[] = [
  { mode: 'white_noise', label: 'Rumore Bianco', icon: '⚪', category: 'noise' },
  { mode: 'pink_noise', label: 'Rumore Rosa', icon: '🟣', category: 'noise' },
  { mode: 'brown_noise', label: 'Rumore Marrone', icon: '🟤', category: 'noise' },
  { mode: 'binaural_alpha', label: 'Alpha (Focus)', icon: '🧘', category: 'binaural' },
  { mode: 'binaural_beta', label: 'Beta (Concentrazione)', icon: '⚡', category: 'binaural' },
  { mode: 'binaural_theta', label: 'Theta (Creatività)', icon: '✨', category: 'binaural' },
  { mode: 'rain', label: 'Pioggia', icon: '🌧️', category: 'ambient' },
  { mode: 'thunderstorm', label: 'Temporale', icon: '⛈️', category: 'ambient' },
  { mode: 'fireplace', label: 'Camino', icon: '🔥', category: 'ambient' },
  { mode: 'cafe', label: 'Caffè', icon: '☕', category: 'ambient' },
  { mode: 'library', label: 'Biblioteca', icon: '📚', category: 'ambient' },
  { mode: 'forest', label: 'Foresta', icon: '🌲', category: 'ambient' },
  { mode: 'ocean', label: 'Oceano', icon: '🌊', category: 'ambient' },
  { mode: 'night', label: 'Notte', icon: '🌙', category: 'ambient' },
];

const PRESETS: { preset: AudioPreset; label: string; description: string }[] = [
  { preset: 'focus', label: 'Focus', description: 'Binaural alpha per concentrazione' },
  { preset: 'deep_work', label: 'Lavoro Profondo', description: 'Beta + rumore marrone' },
  { preset: 'creative', label: 'Creatività', description: 'Theta + natura' },
  { preset: 'library', label: 'Biblioteca', description: 'Ambiente tranquillo' },
  { preset: 'starbucks', label: 'Starbucks', description: 'Atmosfera caffè' },
  { preset: 'rainy_day', label: 'Giorno di Pioggia', description: 'Pioggia + camino' },
  { preset: 'nature', label: 'Natura', description: 'Foresta + oceano' },
];

export function AmbientAudioControl() {
  const {
    playbackState,
    masterVolume,
    currentPreset,
    layers,
    error,
    play,
    pause,
    stop,
    addLayer,
    removeLayer,
    setLayerVolume,
    toggleLayer,
    applyPreset,
    setMasterVolume,
    clearLayers,
  } = useAmbientAudio();

  const [selectedMode, setSelectedMode] = useState<AudioMode>('white_noise');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isPlaying = playbackState === 'playing';
  const isPaused = playbackState === 'paused';

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleStop = () => {
    stop();
    clearLayers();
  };

  const handleAddLayer = () => {
    addLayer(selectedMode);
  };

  const handlePresetClick = (preset: AudioPreset) => {
    applyPreset(preset);
    if (playbackState === 'idle') {
      play();
    }
  };

  // Group modes by category
  const noiseModesData = AUDIO_MODES.filter(m => m.category === 'noise');
  const binauralModesData = AUDIO_MODES.filter(m => m.category === 'binaural');
  const ambientModesData = AUDIO_MODES.filter(m => m.category === 'ambient');

  // Check if ambient sounds are implemented
  const isAmbientImplemented = (mode: AudioMode) => {
    return ['rain', 'thunderstorm', 'fireplace', 'cafe', 'library', 'forest', 'ocean', 'night'].includes(mode) === false;
  };

  return (
    <div className="space-y-6">
      {/* Master Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-500" />
            Audio Ambientale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Master Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium">
                {masterVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                Volume Principale
              </label>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {Math.round(masterVolume * 100)}%
              </span>
            </div>
            <Slider
              value={[masterVolume * 100]}
              onValueChange={(values) => setMasterVolume(values[0] / 100)}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePlayPause}
              variant={isPlaying ? 'default' : 'outline'}
              className="flex-1"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pausa
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </>
              )}
            </Button>
            <Button
              onClick={handleStop}
              variant="outline"
              disabled={playbackState === 'idle'}
            >
              <Square className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preset Rapidi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.preset}
                onClick={() => handlePresetClick(p.preset)}
                variant={currentPreset === p.preset ? 'default' : 'outline'}
                className="h-auto flex-col items-start p-3 text-left"
              >
                <span className="font-medium text-sm">{p.label}</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-normal">
                  {p.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Advanced: Layer Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Mixer Avanzato</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Nascondi' : 'Mostra'}
            </Button>
          </CardTitle>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-4">
            {/* Active Layers */}
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
                          onValueChange={(values) => setLayerVolume(layer.id, values[0] / 100)}
                          max={100}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeLayer(layer.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Layer */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Aggiungi Layer
              </h4>
              
              {/* Noise */}
              <div className="space-y-1">
                <p className="text-xs text-slate-600 dark:text-slate-400">Rumore</p>
                <div className="grid grid-cols-3 gap-1">
                  {noiseModesData.map((m) => (
                    <Button
                      key={m.mode}
                      size="sm"
                      variant={selectedMode === m.mode ? 'default' : 'outline'}
                      onClick={() => setSelectedMode(m.mode)}
                      className="text-xs"
                    >
                      {m.icon} {m.label.split(' ')[1]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Binaural */}
              <div className="space-y-1">
                <p className="text-xs text-slate-600 dark:text-slate-400">Binaural Beats</p>
                <div className="grid grid-cols-3 gap-1">
                  {binauralModesData.map((m) => (
                    <Button
                      key={m.mode}
                      size="sm"
                      variant={selectedMode === m.mode ? 'default' : 'outline'}
                      onClick={() => setSelectedMode(m.mode)}
                      className="text-xs"
                    >
                      {m.icon} {m.label.split(' ')[0]}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Ambient - Coming Soon */}
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

              <Button onClick={handleAddLayer} className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Aggiungi Layer
              </Button>
            </div>

            {layers.length > 0 && (
              <Button
                onClick={clearLayers}
                variant="outline"
                className="w-full text-red-600 hover:text-red-700"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Rimuovi Tutti i Layer
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <Wind className="w-3 h-3 inline mr-1" />
            L&apos;audio ambientale può migliorare la concentrazione durante lo studio.
            I binaural beats richiedono cuffie stereo per un effetto ottimale.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
