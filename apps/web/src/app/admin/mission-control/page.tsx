/**
 * Mission Control - Entry Page
 * Landing page for the mission-control section, linking to its four
 * subsections (infra, key-vault, health, ai-email). Without this page,
 * navigating to /admin/mission-control directly (rather than a subsection)
 * returns a 404.
 */

import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Key, Activity, Mail } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MissionControlPage() {
  const t = await getTranslations('admin');

  const sections = [
    {
      href: '/admin/mission-control/infra',
      icon: Server,
      title: t('infrastructure'),
      description: t('infrastructureDescription'),
    },
    {
      href: '/admin/mission-control/key-vault',
      icon: Key,
      title: t('keyVault'),
      description: t('keyVaultDescription'),
    },
    {
      href: '/admin/mission-control/health',
      icon: Activity,
      title: t('serviceHealth'),
      description: t('serviceHealthDescription'),
    },
    {
      href: '/admin/mission-control/ai-email',
      icon: Mail,
      title: t('aiEmailMonitoring'),
      description: t('aiEmailMonitoringDescription'),
    },
  ] as const;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('missionControlTitle')}</h1>
        <p className="text-muted-foreground">{t('missionControlDescription')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
