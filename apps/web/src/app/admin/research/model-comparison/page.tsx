'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { csrfFetch } from '@/lib/auth';

interface ConfigResponse {
  availableModels: string[];
  profiles: Array<{ name: string; dsaProfile: string }>;
  defaults: { turns: number; difficulty: string };
}

interface ComparisonResponse {
  report: string;
  data: {
    modelResults: Array<{
      model: string;
      maestroId: string;
      profileName: string;
      tutorBenchScores: {
        scaffolding: number;
        hinting: number;
        adaptation: number;
        misconceptionHandling: number;
        overall: number;
      };
      simulationSummary: { status: string; turnsCompleted: number };
    }>;
    safetyBaseline: { totalScenarios: number; passed: number; failed: number };
  };
}

export default function ModelComparisonPage() {
  const t = useTranslations('admin');
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [maestroIds, setMaestroIds] = useState('prof-einstein');
  const [turns, setTurns] = useState(5);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/research/model-comparison');
      if (!res.ok) throw new Error(`${res.status}`);
      const data: ConfigResponse = await res.json();
      setConfig(data);
      setSelectedModels(data.availableModels.filter((m) => !m.includes('realtime')).slice(0, 3));
      setSelectedProfiles(data.profiles.map((p) => p.name).slice(0, 2));
      setTurns(data.defaults.turns);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const runComparison = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await csrfFetch('/api/admin/research/model-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: selectedModels,
          maestroIds: maestroIds.split(',').map((s) => s.trim()),
          profileNames: selectedProfiles,
          turns,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data: ComparisonResponse = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed');
    } finally {
      setRunning(false);
    }
  };

  const toggleModel = (m: string) => {
    setSelectedModels((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const toggleProfile = (p: string) => {
    setSelectedProfiles((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  if (loading) return <p className="p-6">{t('research.loading')}</p>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t('modelComparison.title')}</h1>
        <p className="text-muted-foreground">{t('modelComparison.description')}</p>
      </div>

      {/* Configuration */}
      <div className="rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold">{t('modelComparison.configTitle')}</h2>

        {/* Model selector */}
        <div>
          <label className="text-sm font-medium">{t('modelComparison.models')}</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {config?.availableModels
              .filter((m) => !m.includes('realtime'))
              .map((m) => (
                <button
                  key={m}
                  onClick={() => toggleModel(m)}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    selectedModels.includes(m)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {m}
                </button>
              ))}
          </div>
        </div>

        {/* Profile selector */}
        <div>
          <label className="text-sm font-medium">{t('modelComparison.profiles')}</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {config?.profiles.map((p) => (
              <button
                key={p.name}
                onClick={() => toggleProfile(p.name)}
                className={`px-3 py-1 text-sm rounded-full border ${
                  selectedProfiles.includes(p.name)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {p.name} ({p.dsaProfile})
              </button>
            ))}
          </div>
        </div>

        {/* Maestro IDs + Turns */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium">{t('modelComparison.maestroIds')}</label>
            <input
              type="text"
              value={maestroIds}
              onChange={(e) => setMaestroIds(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder={t('modelComparison.maestroPlaceholder')}
            />
          </div>
          <div className="w-32">
            <label className="text-sm font-medium">{t('modelComparison.turns')}</label>
            <input
              type="number"
              value={turns}
              onChange={(e) => setTurns(Number(e.target.value))}
              min={1}
              max={20}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={runComparison}
          disabled={running || selectedModels.length === 0 || selectedProfiles.length === 0}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {running ? t('modelComparison.running') : t('modelComparison.runButton')}
        </button>

        {/* Combo count */}
        <p className="text-xs text-muted-foreground">
          {selectedModels.length} × {maestroIds.split(',').length} × {selectedProfiles.length} ={' '}
          {selectedModels.length * maestroIds.split(',').length * selectedProfiles.length}{' '}
          {t('modelComparison.experiments')}
        </p>
      </div>

      {error && (
        <div className="rounded border border-destructive p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Safety baseline */}
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">{t('modelComparison.safetyBaseline')}</h2>
            <div className="flex gap-4 text-sm">
              <span>
                {t('modelComparison.scenarios')}: {result.data.safetyBaseline.totalScenarios}
              </span>
              <span className="text-green-600">✅ {result.data.safetyBaseline.passed}</span>
              {result.data.safetyBaseline.failed > 0 && (
                <span className="text-red-600">❌ {result.data.safetyBaseline.failed}</span>
              )}
            </div>
          </div>

          {/* Markdown report */}
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold mb-2">{t('modelComparison.reportTitle')}</h2>
            <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-4 rounded overflow-auto max-h-[600px]">
              {result.report}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
