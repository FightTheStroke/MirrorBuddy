import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { MaestroSessionPage } from './maestro-session-page';
import { getMaestroById } from '@/data';
import type { ToolType } from '@/types';
import type { MaestroFull } from '@/data/maestri';

interface MaestroPageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tool?: string }>;
}

export async function generateMetadata({ params }: MaestroPageProps) {
  const { id } = await params;
  const maestro = getMaestroById(id);
  const t = await getTranslations('metadata');

  if (!maestro) {
    return {
      title: 'MirrorBuddy',
    };
  }

  return {
    title: `${maestro.name} | ${t('title')}`,
    description: maestro.specialty,
  };
}

function toSerializableMaestro(maestro: MaestroFull) {
  return {
    id: maestro.id,
    name: maestro.name,
    displayName: maestro.displayName,
    subject: maestro.subject,
    specialty: maestro.specialty,
    voice: maestro.voice,
    voiceInstructions: maestro.voiceInstructions,
    teachingStyle: maestro.teachingStyle,
    avatar: maestro.avatar,
    color: maestro.color,
    systemPrompt: maestro.systemPrompt,
    greeting: maestro.greeting,
    excludeFromGamification: maestro.excludeFromGamification,
    tools: maestro.tools,
  };
}

export default async function MaestroPage({ params, searchParams }: MaestroPageProps) {
  const { id } = await params;
  const search = await searchParams;
  const maestro = getMaestroById(id);

  if (!maestro) {
    notFound();
  }

  // Read the tool query param if present
  const requestedToolType = search.tool as ToolType | undefined;

  return (
    <MaestroSessionPage
      maestro={toSerializableMaestro(maestro)}
      requestedToolType={requestedToolType}
    />
  );
}
