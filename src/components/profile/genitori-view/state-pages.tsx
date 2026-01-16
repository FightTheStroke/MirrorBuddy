/**
 * State page components for GenitoriView
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, RefreshCw, Shield, Trash2 } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-accent-themed" />
      <p className="text-slate-600 dark:text-slate-400">Caricamento profilo...</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center py-8">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <div>
        <h3 className="font-semibold text-lg">Errore</h3>
        <p className="text-slate-600 dark:text-slate-400 mt-1">{error}</p>
      </div>
      <Button onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Riprova
      </Button>
    </div>
  );
}

export function NoProfileState({ onGenerate, isGenerating, error }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-5 h-5 text-accent-themed">✓</div>
          Nessun Profilo Disponibile
        </CardTitle>
        <CardDescription>
          Per creare il profilo, è necessario prima interagire con i Professori.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Genera Profilo
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
}

export function NeedsConsentState({ onConsent }: { onConsent: () => void }) {
  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
          <Shield className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
        </div>
        <CardTitle>Consenso per il Dashboard Genitori</CardTitle>
        <CardDescription>
          Per visualizzare le osservazioni dei Professori, abbiamo bisogno del tuo consenso.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={onConsent} className="w-full">
          <Shield className="h-4 w-4 mr-2" />
          Acconsento alla Visualizzazione
        </Button>
      </CardContent>
    </Card>
  );
}

export function DeletionPendingState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <Trash2 className="h-5 w-5" />
          Cancellazione Richiesta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600 dark:text-slate-400">
          I dati verranno eliminati entro 30 giorni, come previsto dal GDPR.
        </p>
      </CardContent>
    </Card>
  );
}
