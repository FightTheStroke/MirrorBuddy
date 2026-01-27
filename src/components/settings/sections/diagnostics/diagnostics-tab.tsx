'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Wrench, Server, MessageSquare, Radio, Mic, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DiagnosticResult } from './types';
import { runConfigCheck, runChatTest } from './config-chat-tests';
import { runVoiceTest } from './voice-test';
import { runMicTest, runSpeakerTest } from './media-tests';
import { useMediaDevices } from './media-device-hooks';
import { WaveformVisualization } from './waveform-visualization';
import { WebcamPreview } from './webcam-preview';
import { DiagnosticCard, PlatformHelpCard, TroubleshootingCard } from './diagnostic-cards';

export function DiagnosticsTab() {
  const t = useTranslations('settings.diagnostics');
  const [configCheck, setConfigCheck] = useState<DiagnosticResult>({ status: 'idle' });
  const [chatTest, setChatTest] = useState<DiagnosticResult>({ status: 'idle' });
  const [voiceTest, setVoiceTest] = useState<DiagnosticResult>({ status: 'idle' });
  const [micTest, setMicTest] = useState<DiagnosticResult>({ status: 'idle' });
  const [speakerTest, setSpeakerTest] = useState<DiagnosticResult>({ status: 'idle' });

  const {
    availableMics,
    selectedMicId,
    setSelectedMicId,
    refreshMicrophones,
    availableCameras,
    selectedCamId,
    setSelectedCamId,
    refreshCameras,
  } = useMediaDevices();

  const handleConfigCheck = async () => {
    setConfigCheck({ status: 'running' });
    const result = await runConfigCheck();
    setConfigCheck(result);
  };

  const handleChatTest = async () => {
    setChatTest({ status: 'running' });
    const result = await runChatTest();
    setChatTest(result);
  };

  const handleVoiceTest = async () => {
    setVoiceTest({ status: 'running', message: t('connecting') });
    const result = await runVoiceTest();
    setVoiceTest(result);
  };

  const handleMicTest = async () => {
    setMicTest({ status: 'running' });
    const result = await runMicTest();
    setMicTest(result);
  };

  const handleSpeakerTest = async () => {
    setSpeakerTest({ status: 'running' });
    const result = await runSpeakerTest();
    setSpeakerTest(result);
  };

  const runAllTests = async () => {
    await handleConfigCheck();
    await handleChatTest();
    await handleVoiceTest();
    await handleMicTest();
    await handleSpeakerTest();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            {t('description')}
          </p>

          <Button onClick={runAllTests} className="w-full" size="lg">
            <Wrench className="w-4 h-4 mr-2" />
            {t('runAllTests')}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DiagnosticCard
          title={t('config')}
          icon={<Server className="w-5 h-5 text-blue-500" />}
          result={configCheck}
          onRun={handleConfigCheck}
        />

        <DiagnosticCard
          title={t('chatApi')}
          icon={<MessageSquare className="w-5 h-5 text-green-500" />}
          result={chatTest}
          onRun={handleChatTest}
        />

        <DiagnosticCard
          title={t('voiceTest')}
          icon={<Radio className="w-5 h-5 text-purple-500" />}
          result={voiceTest}
          onRun={handleVoiceTest}
        />

        <DiagnosticCard
          title={t('microphone')}
          icon={<Mic className="w-5 h-5 text-red-500" />}
          result={micTest}
          onRun={handleMicTest}
        />

        <DiagnosticCard
          title={t('speaker')}
          icon={<Volume2 className="w-5 h-5 text-amber-500" />}
          result={speakerTest}
          onRun={handleSpeakerTest}
        />
      </div>

      <WaveformVisualization
        availableMics={availableMics}
        selectedMicId={selectedMicId}
        onMicChange={setSelectedMicId}
        onRefresh={refreshMicrophones}
      />

      <WebcamPreview
        availableCameras={availableCameras}
        selectedCamId={selectedCamId}
        onCameraChange={setSelectedCamId}
        onRefresh={refreshCameras}
      />

      <PlatformHelpCard />

      <TroubleshootingCard />
    </div>
  );
}
