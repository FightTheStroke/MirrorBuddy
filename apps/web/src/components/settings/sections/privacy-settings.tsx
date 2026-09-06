'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClientIdentity } from '@/lib/auth/identity-provider';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { LogoutActions } from '@/components/ui/logout-actions';
import { PrivacyConsentSettings } from './privacy-consent-settings';
import { CrossMaestroMemorySettings } from './cross-maestro-memory-settings';

// Privacy Settings
export function PrivacySettings() {
  const t = useTranslations('settings.privacy');
  const tSession = useTranslations('common.session');
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [version, setVersion] = useState<{
    version: string;
    buildTime: string;
    environment: string;
  } | null>(null);
  const identity = useClientIdentity();

  useEffect(() => {
    fetch('/api/version')
      .then((res) => res.json())
      .then(setVersion)
      .catch(() => null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Account Section - shows when authenticated */}
      {identity.status !== 'anonymous' && (
        <Card data-testid="user-menu">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              {t('account')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {identity.status === 'authenticated'
                ? t('seiConnessoAlTuoAccountMirrorbuddy')
                : tSession('unavailable')}
            </p>
            <LogoutActions />
          </CardContent>
        </Card>
      )}

      <PrivacyConsentSettings />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            {t('privacyESicurezza')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 dark:text-slate-400">
            {t('iTuoiDatiSonoAlSicuroMirrorbuddyEProgettatoPensand')}
            {t('privacyDeiBambiniERispettaLeNormativeCoppaEGdpr')}
          </p>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
            <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">
              {t('iTuoiDatiSonoProtetti')}
            </h4>
            <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
              <li>{t('dataStoredLocally')}</li>
              <li>{t('noDataShared')}</li>
              <li>{t('conversationsNotRecorded')}</li>
              <li>{t('deleteDataAnytime')}</li>
            </ul>
          </div>

          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
            disabled={identity.status !== 'authenticated'}
            onClick={async () => {
              const confirmed = window.confirm(
                'Sei sicuro di voler eliminare tutti i tuoi dati? Questa azione non può essere annullata.',
              );
              if (confirmed) {
                setDeleteFailed(false);
                try {
                  await useOnboardingStore.getState().resetAllData();
                } catch {
                  setDeleteFailed(true);
                }
              }
            }}
          >
            {t('deleteAllData')}
          </Button>
          {deleteFailed && <p role="alert">{tSession('unavailable')}</p>}
        </CardContent>
      </Card>

      {/* Cross-Maestro Memory Settings */}
      <CrossMaestroMemorySettings />

      {/* Version Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('informazioniApp')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{t('versione')}</span>
            <span className="font-mono">{version ? `v${version.version}` : 'Loading...'}</span>
          </div>
          {version?.environment === 'development' && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">{t('ambiente')}</span>
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">
                {t('development')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
