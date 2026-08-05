'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { Period, UserVoiceSpend } from '@/lib/metrics/voice-usage-service';

interface VoiceCostsResponse {
  period: Period;
  summary: {
    totalCostEur: number;
    activeUsers: number;
    costPerUserEur: number;
    byDay: { day: string; costEur: number }[];
  };
  users: UserVoiceSpend[];
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Oggi' },
  { value: 'week', label: '7 giorni' },
  { value: 'month', label: 'Questo mese' },
];

const euro = (value: number): string =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);

export default function VoiceCostsPage() {
  const [period, setPeriod] = useState<Period>('day');
  const [data, setData] = useState<VoiceCostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/voice-costs?period=${period}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData((await response.json()) as VoiceCostsResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <main className="p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Costi voce per utente</h1>
          <p className="text-sm text-muted-foreground">
            Calcolati sui token realmente fatturati da Azure Realtime, non su stime al minuto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Periodo" className="flex gap-1">
            {PERIODS.map((option) => (
              <Button
                key={option.value}
                variant={period === option.value ? 'default' : 'outline'}
                size="sm"
                aria-pressed={period === option.value}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchData()}
            aria-label="Aggiorna"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {loading && (
        <p className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Caricamento dei costi…
        </p>
      )}

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {error}
        </p>
      )}

      {data && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Summary label="Totale periodo" value={euro(data.summary.totalCostEur)} />
            <Summary label="Utenti attivi" value={String(data.summary.activeUsers)} />
            <Summary label="Media per utente" value={euro(data.summary.costPerUserEur)} />
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Costo della voce per utente nel periodo selezionato
                </caption>
                <thead>
                  <tr className="border-b text-left">
                    <th scope="col" className="p-3">
                      Utente
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Sessioni
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Minuti parlati
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Costo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-muted-foreground">
                        Nessun uso della voce in questo periodo.
                      </td>
                    </tr>
                  )}
                  {data.users.map((user) => (
                    <tr key={user.userId} className="border-b last:border-0">
                      <th scope="row" className="p-3 font-normal">
                        {user.name || user.email || user.userId}
                      </th>
                      <td className="p-3 text-right tabular-nums">{user.sessions}</td>
                      <td className="p-3 text-right tabular-nums">
                        {user.spokenMinutes.toFixed(1)}
                      </td>
                      <td className="p-3 text-right tabular-nums font-medium">
                        {euro(user.costEur)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
