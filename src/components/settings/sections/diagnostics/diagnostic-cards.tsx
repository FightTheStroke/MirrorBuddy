'use client';

import { CheckCircle, XCircle, Loader2, Radio, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DiagnosticStatus, DiagnosticResult } from './types';

interface StatusIconProps {
  status: DiagnosticStatus;
}

export function StatusIcon({ status }: StatusIconProps) {
  switch (status) {
    case 'running':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Radio className="w-5 h-5 text-slate-400" />;
  }
}

interface DiagnosticCardProps {
  title: string;
  icon: React.ReactNode;
  result: DiagnosticResult;
  onRun: () => void;
}

export function DiagnosticCard({ title, icon, result, onRun }: DiagnosticCardProps) {
  return (
    <div className={cn(
      'p-4 rounded-xl border-2 transition-all',
      result.status === 'success' && 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700',
      result.status === 'error' && 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700',
      result.status === 'running' && 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700',
      result.status === 'idle' && 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50',
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <StatusIcon status={result.status} />
      </div>
      {result.message && (
        <p className={cn(
          'text-sm',
          result.status === 'success' && 'text-green-700 dark:text-green-400',
          result.status === 'error' && 'text-red-700 dark:text-red-400',
          result.status === 'running' && 'text-blue-700 dark:text-blue-400',
        )}>
          {result.message}
        </p>
      )}
      {result.details && (
        <p className="text-xs text-slate-500 mt-1 font-mono">{result.details}</p>
      )}
      <Button
        onClick={onRun}
        disabled={result.status === 'running'}
        variant="default"
        size="sm"
        className="mt-3 w-full"
      >
        {result.status === 'running' ? 'Testing...' : result.status === 'idle' ? 'Esegui Test' : 'Ripeti Test'}
      </Button>
    </div>
  );
}

export function PlatformHelpCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          Aiuto sulla Piattaforma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-600 dark:text-slate-400">
          Hai bisogno di aiuto con la configurazione o hai problemi tecnici?
          Puoi chiedere al tuo Coach: conosce tutte le funzionalita di MirrorBuddy!
        </p>

        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Azure OpenAI</span>
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Voce e Audio</span>
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Flashcard e Quiz</span>
          <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">Accessibilita</span>
        </div>

        <p className="text-xs text-slate-500 italic">
          Vai nella sezione Chat e parla con il tuo Coach preferito.
        </p>
      </CardContent>
    </Card>
  );
}

export function TroubleshootingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risoluzione Problemi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="font-medium text-blue-700 dark:text-blue-300">Chat non funziona?</p>
          <p className="text-blue-600 dark:text-blue-400 mt-1">
            Verifica che Azure OpenAI o Ollama siano configurati. Controlla le variabili .env e i log del server.
          </p>
        </div>

        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="font-medium text-purple-700 dark:text-purple-300">Voice non funziona?</p>
          <p className="text-purple-600 dark:text-purple-400 mt-1">
            La voce richiede Azure OpenAI Realtime API (AZURE_OPENAI_REALTIME_*). Ollama non supporta voice.
          </p>
        </div>

        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="font-medium text-red-700 dark:text-red-300">Microfono bloccato?</p>
          <p className="text-red-600 dark:text-red-400 mt-1">
            Clicca sull&apos;icona del lucchetto nella barra URL del browser e abilita il permesso microfono.
          </p>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="font-medium text-amber-700 dark:text-amber-300">Audio non si sente?</p>
          <p className="text-amber-600 dark:text-amber-400 mt-1">
            Verifica il volume del sistema. Se usi Chrome, potrebbe bloccare l&apos;audio autoplay - clicca prima sulla pagina.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
