'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/ui/toast';

export interface StickyKeysStatus {
  isSupported: boolean;
  isEnabled: boolean;
  platform: 'macos' | 'windows' | 'linux' | 'unknown';
}

export function useStickyKeys() {
  const [status, setStatus] = useState<StickyKeysStatus>({
    isSupported: false,
    isEnabled: false,
    platform: 'unknown',
  });

  useEffect(() => {
    const platform = detectPlatform();
    const isSupported = ['macos', 'windows'].includes(platform);

    setStatus({
      isSupported,
      isEnabled: false,
      platform,
    });

    if (isSupported) {
      checkStickyKeysStatus(platform as 'macos' | 'windows');
    }
  }, []);

  const checkStickyKeysStatus = useCallback(async (platform: 'macos' | 'windows') => {
    let enabled = false;

    if (platform === 'macos') {
      try {
        const { csrfFetch } = await import('@/lib/auth/csrf-client');
        const response = await csrfFetch('/api/accessibility/sticky-keys');
        if (response.ok) {
          const data = await response.json();
          enabled = data.enabled || false;
        }
      } catch (_error) {
        console.error('Failed to check Sticky Keys status');
      }
    }

    setStatus(prev => ({
      ...prev,
      isEnabled: enabled,
    }));
  }, [status.platform]);

  const enableStickyKeys = useCallback(async () => {
    if (status.platform === 'macos') {
      try {
        const { csrfFetch } = await import('@/lib/auth/csrf-client');
        const response = await csrfFetch('/api/accessibility/sticky-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: true }),
        });

        if (response.ok) {
          setStatus(prev => ({ ...prev, isEnabled: true }));
          toast.success(
            'Sticky Keys attivate',
            'Le modifiche richiedono un riavvio del browser'
          );
        }
      } catch (_error) {
        toast.error(
          'Impossibile attivare Sticky Keys',
          'Attivale manualmente nelle impostazioni di sistema'
        );
      }
    } else if (status.platform === 'windows') {
      toast.info(
        'Attiva Sticky Keys in Windows',
        'Premi Shift 5 volte per attivare/disattivare'
      );
    }
  }, [status.platform]);

  useEffect(() => {
    const platform = detectPlatform();
    const isSupported = ['macos', 'windows'].includes(platform);

    setStatus({
      isSupported,
      isEnabled: false,
      platform,
    });

    if (isSupported) {
      checkStickyKeysStatus(platform as 'macos' | 'windows');
    }
  }, [checkStickyKeysStatus]);

  const openAccessibilitySettings = () => {
    if (status.platform === 'macos') {
      window.open('x-apple.systempreferences:com.apple.preference.universalaccess', '_blank');
    } else if (status.platform === 'windows') {
      window.open('ms-settings:easeofaccess-stickykeys', '_blank');
    } else if (status.platform === 'linux') {
      toast.info(
        'Impostazioni di accessibilità',
        'Apri le impostazioni del tuo sistema Linux'
      );
    }
  };

  return {
    status,
    enableStickyKeys,
    openAccessibilitySettings,
  };
}

function detectPlatform(): 'macos' | 'windows' | 'linux' | 'unknown' {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('mac') || userAgent.includes('darwin')) {
    return 'macos';
  }

  if (userAgent.includes('win')) {
    return 'windows';
  }

  if (userAgent.includes('linux')) {
    return 'linux';
  }

  return 'unknown';
}

export function StickyKeysHelper() {
  const { status, enableStickyKeys, openAccessibilitySettings } = useStickyKeys();

  if (!status.isSupported) {
    return (
      <div className="p-4 bg-muted/50 border border-border rounded-lg">
        <h4 className="font-semibold mb-2">Sticky Keys</h4>
        <p className="text-sm text-muted-foreground">
          Sticky Keys non sono disponibili su questo sistema operativo ({status.platform}).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Sticky Keys</h4>
        {status.isEnabled && (
          <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
            Attivo
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Sticky Keys permette di premere i tasti modificatori (Shift, Ctrl, Alt, Cmd)
        uno alla volta invece di tenerli premuti.
      </p>

      <div className="flex gap-2">
        {!status.isEnabled ? (
          <button
            onClick={enableStickyKeys}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Attiva Sticky Keys
          </button>
        ) : (
          <button
            onClick={openAccessibilitySettings}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Apri impostazioni
          </button>
        )}
      </div>

      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Suggerimento:</strong> Per una digitazione più efficiente, abilita
          Sticky Keys nelle impostazioni di accessibilità del sistema operativo.
        </p>
      </div>
    </div>
  );
}
