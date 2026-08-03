'use client';

/**
 * RobotPairingCard — Settings › Integrations
 *
 * Lets a parent pair a Reachy Mini robot with the logged-in child's account:
 * generate a 6-digit code to type on the robot, see paired robots, unpair.
 * The robot never sees credentials — only a scoped device token it earns by
 * redeeming the code. Serves the "MirrorBuddy with a body" flow.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, Loader2, Trash2, KeyRound, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { csrfFetch } from '@/lib/auth';
import { clientLogger as logger } from '@/lib/logger/client';
import { RobotPairingExplainer } from './robot-pairing-explainer';

interface DeviceSummary {
  id: string;
  label: string | null;
  pairedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

interface PairCode {
  code: string;
  expiresAt: string;
}

// A parent types the code on the robot and looks back at the screen: a few seconds
// is the window in which "did it work?" is still an open question.
const PAIRING_POLL_MS = 3000;

export function RobotPairingCard() {
  const t = useTranslations('settings.robotPairing');
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [code, setCode] = useState<PairCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const knownDeviceIds = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/devices', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices ?? []);
      }
    } catch (error) {
      logger.error('Failed to load robots', { error: String(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // While a code is outstanding the robot is about to pair, and nothing pushes that
  // event to the browser: the list was read once at mount, so the page kept saying
  // "no robot connected" long after the robot was, in fact, connected. Poll until
  // the pairing lands or the code expires.
  useEffect(() => {
    if (!code) return;
    const expiresAt = new Date(code.expiresAt).getTime();
    const timer = setInterval(() => {
      if (Date.now() >= expiresAt) {
        setCode(null);
        return;
      }
      void load();
    }, PAIRING_POLL_MS);
    return () => clearInterval(timer);
  }, [code, load]);

  // The robot appeared: the code has served its purpose, so stop showing it. Compare
  // against the robots known when the code was issued — a household with a robot
  // already paired must still see the code until the *new* one shows up.
  useEffect(() => {
    if (!code) return;
    if (devices.some((d) => !knownDeviceIds.current.has(d.id))) setCode(null);
  }, [devices, code]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setCode(null);
    setError(null);
    knownDeviceIds.current = new Set(devices.map((d) => d.id));
    try {
      const res = await csrfFetch('/api/devices/pair-code', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setCode(await res.json());
        return;
      }
      logger.error('Pairing code request rejected', { status: res.status });
      if (res.status === 401 || res.status === 403) {
        setError(t('errorAuth'));
      } else if (res.status === 429) {
        setError(t('errorRateLimit'));
      } else {
        setError(t('errorGeneric', { status: res.status }));
      }
    } catch (error) {
      logger.error('Failed to generate pairing code', { error: String(error) });
      setError(t('errorNetwork'));
    } finally {
      setGenerating(false);
    }
  }, [t, devices]);

  const revoke = useCallback(async (id: string) => {
    try {
      const res = await csrfFetch(`/api/devices/${id}`, { method: 'DELETE' });
      if (res.ok) setDevices((d) => d.filter((x) => x.id !== id));
    } catch (error) {
      logger.error('Failed to revoke robot', { error: String(error) });
    }
  }, []);

  const copyCode = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the code is shown on screen anyway */
    }
  }, [code]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RobotPairingExplainer />

        <section className="space-y-3" aria-labelledby="robot-howto">
          <h4 id="robot-howto" className="text-sm font-semibold">
            {t('howItWorksTitle')}
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>{t('step1')}</li>
            <li>{t('step2')}</li>
            <li>{t('step3')}</li>
          </ol>
          <Button onClick={generate} disabled={generating}>
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4 mr-2" />
            )}
            {t('generateCode')}
          </Button>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/5 p-4 space-y-1"
          >
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {t('errorTitle')}
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {code && (
          <div className="rounded-lg border border-accent-themed/40 bg-accent-themed/5 p-4 space-y-2">
            <p className="text-sm text-muted-foreground">{t('codeHint')}</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono font-bold tracking-[0.3em]">{code.code}</span>
              <Button variant="outline" size="sm" onClick={copyCode} aria-label={t('copy')}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('codeExpires')}</p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('pairedRobots')}</h4>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('loading')}</span>
            </div>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noRobots')}</p>
          ) : (
            <ul className="space-y-2">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{d.label || t('unnamedRobot')}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.pairedAt
                        ? t('pairedOn', {
                            date: new Date(d.pairedAt).toLocaleDateString(),
                          })
                        : t('pendingPairing')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke(d.id)}
                    aria-label={t('unpair')}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{t('privacyNote')}</p>
      </CardContent>
    </Card>
  );
}
