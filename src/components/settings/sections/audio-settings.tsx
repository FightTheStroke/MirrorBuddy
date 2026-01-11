/**
 * Audio Settings Component
 * Global device preferences for audio and video
 *
 * TRANSPORT COMPATIBILITY:
 * All device selection and testing works with both WebSocket and WebRTC transports.
 * - Microphone selector uses standard getUserMedia API (transport-independent)
 * - Output/speaker selection uses system audio APIs (transport-independent)
 * - Camera preview uses standard getUserMedia API (transport-independent)
 * - Microphone/speaker/camera tests are local operations, independent of voice transport mode
 *
 * Settings apply globally to all voice sessions regardless of transport type.
 */

'use client';

import { useEffect } from 'react';
import { Volume2, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/lib/stores';
import { useAudioDevices } from './audio-settings/hooks/use-audio-devices';
import { useMicrophoneTest } from './audio-settings/hooks/use-microphone-test';
import { useCameraTest } from './audio-settings/hooks/use-camera-test';
import { useSpeakerTest } from './audio-settings/hooks/use-speaker-test';
import { MicrophoneSelector } from './audio-settings/components/microphone-selector';
import { OutputSelector } from './audio-settings/components/output-selector';
import { CameraPreview } from './audio-settings/components/camera-preview';

export function AudioSettings() {
  const {
    preferredMicrophoneId,
    preferredOutputId,
    preferredCameraId,
    setPreferredMicrophone,
    setPreferredOutput,
    setPreferredCamera,
  } = useSettingsStore();

  const {
    availableMics,
    availableOutputs,
    availableCameras,
    refreshDevices,
  } = useAudioDevices();

  const {
    micTestActive,
    audioLevel,
    waveformCanvasRef,
    startMicTest,
    stopMicTest,
  } = useMicrophoneTest(preferredMicrophoneId);

  const {
    camTestActive,
    videoRef,
    startCamTest,
    stopCamTest,
  } = useCameraTest(preferredCameraId);

  const {
    speakerTestActive,
    testSpeaker,
  } = useSpeakerTest();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicTest();
      stopCamTest();
    };
  }, [stopMicTest, stopCamTest]);

  // Restart tests when device changes
  const handleMicChange = async (deviceId: string) => {
    setPreferredMicrophone(deviceId);
    if (micTestActive) {
      stopMicTest();
      setTimeout(() => startMicTest(), 100);
    }
  };

  const handleOutputChange = (deviceId: string) => {
    setPreferredOutput(deviceId);
  };

  const handleCamChange = async (deviceId: string) => {
    setPreferredCamera(deviceId);
    if (camTestActive) {
      stopCamTest();
      setTimeout(() => startCamTest(), 100);
    }
  };

  return (
    <div className="space-y-6">
      {/* Audio Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-500" />
            Dispositivi Audio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MicrophoneSelector
              preferredMicrophoneId={preferredMicrophoneId}
              availableMics={availableMics}
              micTestActive={micTestActive}
              audioLevel={audioLevel}
              waveformCanvasRef={waveformCanvasRef}
              onMicChange={handleMicChange}
              onRefresh={refreshDevices}
              onStartTest={startMicTest}
              onStopTest={stopMicTest}
            />
            <OutputSelector
              preferredOutputId={preferredOutputId}
              availableOutputs={availableOutputs}
              onOutputChange={handleOutputChange}
            />
          </div>

          {/* Speaker test button */}
          <div className="flex justify-end">
            <Button
              onClick={testSpeaker}
              variant="default"
              size="sm"
              disabled={speakerTestActive}
            >
              <Volume2 className="w-4 h-4 mr-1" />
              {speakerTestActive ? '...' : 'Testa Altoparlanti'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webcam */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="w-5 h-5 text-blue-500" />
            Webcam
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CameraPreview
            preferredCameraId={preferredCameraId}
            availableCameras={availableCameras}
            camTestActive={camTestActive}
            videoRef={videoRef}
            onCamChange={handleCamChange}
            onRefresh={refreshDevices}
            onStartTest={startCamTest}
            onStopTest={stopCamTest}
          />
        </CardContent>
      </Card>

      {/* Info about Continuity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nota per utenti Mac</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Se hai attivo <strong>Continuity Camera</strong>, macOS potrebbe selezionare automaticamente
            la webcam dell&apos;iPhone invece di quella integrata. Usa i menu sopra per scegliere il
            dispositivo corretto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
