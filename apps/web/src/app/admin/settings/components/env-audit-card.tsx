'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import type { ServiceEnvAudit } from '@/lib/admin/env-audit-service';

/**
 * EnvAuditCard - Displays environment variable configuration status
 *
 * Fetches data from /api/admin/env-audit (server-side) where process.env
 * is available. Client components cannot access server-only env vars.
 * SECURITY: Never displays actual values, only set/not-set status.
 */
export function EnvAuditCard() {
  const t = useTranslations('admin.settings.envAudit');
  const [audit, setAudit] = useState<ServiceEnvAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/env-audit')
      .then((res) => res.json())
      .then((data: ServiceEnvAudit[]) => setAudit(data))
      .catch(() => setAudit([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">{t('loading')}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <CardTitle>{t('title')}</CardTitle>
          </div>
        </div>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {audit.map((service) => (
            <div
              key={service.service}
              className="border-b border-border pb-3 last:border-b-0 last:pb-0"
            >
              {/* Service Header */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-foreground">{service.service}</h3>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    service.configured
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  {service.configured ? t('configured') : t('incomplete')}
                </span>
              </div>

              {/* Environment Variables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-4">
                {service.vars.map((v) => (
                  <div key={v.name} className="flex items-center gap-2 text-sm">
                    {v.set ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    <span
                      className={`font-mono text-xs ${
                        v.set ? 'text-muted-foreground' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {v.name}
                      {v.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <span className="text-red-500">*</span> {t('requiredIndicator')}
        </div>
      </CardContent>
    </Card>
  );
}
