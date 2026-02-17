'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Mail, Phone, User, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { csrfFetch } from '@/lib/auth';
import { clientLogger as logger } from '@/lib/logger/client';

interface GuardianData {
  guardianEmail: string;
  guardianPhone: string;
  guardianName: string;
}

export function GuardianContactSection() {
  const t = useTranslations('settings.guardianContact');
  const [data, setData] = useState<GuardianData>({
    guardianEmail: '',
    guardianPhone: '',
    guardianName: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGuardian() {
      try {
        const res = await fetch('/api/user/settings');
        if (res.ok) {
          const json = await res.json();
          setData({
            guardianEmail: json.guardianEmail || '',
            guardianPhone: json.guardianPhone || '',
            guardianName: json.guardianName || '',
          });
        }
      } catch (err) {
        logger.error('Failed to fetch guardian data', { error: String(err) });
      }
    }
    fetchGuardian();
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await csrfFetch('/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify({
          guardianEmail: data.guardianEmail || null,
          guardianPhone: data.guardianPhone || null,
          guardianName: data.guardianName || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || t('saveError'));
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      logger.error('Failed to save guardian data', { error: String(err) });
      setError(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  }, [data, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">{t('recommendationBanner')}</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {t('nameLabel')}
            </span>
            <input
              type="text"
              value={data.guardianName}
              onChange={(e) => setData((prev) => ({ ...prev, guardianName: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder={t('namePlaceholder')}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              {t('emailLabel')}
            </span>
            <input
              type="email"
              value={data.guardianEmail}
              onChange={(e) => setData((prev) => ({ ...prev, guardianEmail: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder={t('emailPlaceholder')}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              {t('phoneLabel')}
            </span>
            <input
              type="tel"
              value={data.guardianPhone}
              onChange={(e) => setData((prev) => ({ ...prev, guardianPhone: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder={t('phonePlaceholder')}
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? t('saving') : saved ? t('saved') : t('save')}
        </Button>

        <p className="text-xs text-muted-foreground">{t('privacyNote')}</p>
      </CardContent>
    </Card>
  );
}
