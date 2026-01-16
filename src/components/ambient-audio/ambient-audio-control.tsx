'use client';

import { useState } from 'react';
import { Wind } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAmbientAudio } from '@/lib/hooks/use-ambient-audio';
import { MasterControls } from './master-controls';
import { PresetsSection } from './presets-section';
import { AdvancedMixer } from './advanced-mixer';
import type { AudioMode, AudioPreset } from '@/types';

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
    toggleLayer: _toggleLayer,
    applyPreset,
    setMasterVolume,
    clearLayers,
  } = useAmbientAudio();

  const [selectedMode, setSelectedMode] = useState<AudioMode>('white_noise');

  const isPlaying = playbackState === 'playing';

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

  return (
    <div className="space-y-6">
      <MasterControls
        isPlaying={isPlaying}
        masterVolume={masterVolume}
        playbackState={playbackState}
        error={error}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onVolumeChange={setMasterVolume}
      />

      <PresetsSection currentPreset={currentPreset} onSelect={handlePresetClick} />

      <AdvancedMixer
        layers={layers}
        selectedMode={selectedMode}
        onModeSelect={setSelectedMode}
        onAddLayer={handleAddLayer}
        onRemoveLayer={removeLayer}
        onLayerVolumeChange={setLayerVolume}
        onClearLayers={clearLayers}
      />

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
