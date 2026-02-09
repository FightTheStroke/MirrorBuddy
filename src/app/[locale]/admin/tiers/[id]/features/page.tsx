/**
 * Tier Features & AI Model Assignment
 * Task: T1-12 (F-27)
 */
/* eslint-disable jsx-a11y/label-has-associated-control */

import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const metadata = {
  title: 'Tier Features | Admin',
};

interface Props {
  params: Promise<{ id: string }>;
}

const FEATURES = [
  { key: 'chat', label: 'Chat Conversations', modelField: 'chatModel' },
  { key: 'voice', label: 'Voice Mode', modelField: 'realtimeModel' },
  { key: 'pdf', label: 'PDF Analysis', modelField: 'pdfModel' },
  { key: 'mindmap', label: 'Mind Maps', modelField: 'mindmapModel' },
  { key: 'quiz', label: 'Quiz Generation', modelField: 'quizModel' },
  { key: 'flashcards', label: 'Flashcards', modelField: 'flashcardsModel' },
  { key: 'summary', label: 'Summaries', modelField: 'summaryModel' },
  { key: 'formula', label: 'Formula Helper', modelField: 'formulaModel' },
  { key: 'chart', label: 'Chart Generation', modelField: 'chartModel' },
  { key: 'homework', label: 'Homework Help', modelField: 'homeworkModel' },
  { key: 'webcam', label: 'Webcam Analysis', modelField: 'webcamModel' },
  { key: 'demo', label: 'Demo Mode', modelField: 'demoModel' },
] as const;

async function getTier(id: string) {
  const tier = await prisma.tierDefinition.findUnique({ where: { id } });
  if (!tier) notFound();
  return tier;
}

async function getModels() {
  return prisma.modelCatalog.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { qualityScore: 'desc' }],
  });
}

async function updateFeatures(formData: FormData) {
  'use server';

  const id = formData.get('id') as string;
  const features: Record<string, boolean> = {};
  const modelUpdates: Record<string, string> = {};

  for (const feature of FEATURES) {
    features[feature.key] = formData.get(`feature_${feature.key}`) === 'on';
    const model = formData.get(`model_${feature.key}`) as string;
    if (model) {
      modelUpdates[feature.modelField] = model;
    }
  }

  await prisma.tierDefinition.update({
    where: { id },
    data: {
      features,
      ...modelUpdates,
    },
  });

  await prisma.tierAuditLog.create({
    data: {
      tierId: id,
      action: 'TIER_UPDATE',
      adminId: 'system',
      changes: { features, models: modelUpdates },
      notes: 'Feature flags and AI models updated',
    },
  });

  revalidatePath('/admin/tiers');
  revalidatePath(`/admin/tiers/${id}/features`);
  redirect(`/admin/tiers/${id}/features`);
}

export default async function TierFeaturesPage({ params }: Props) {
  const { id } = await params;
  const [tier, models] = await Promise.all([getTier(id), getModels()]);

  const tierFeatures = (tier.features as Record<string, boolean>) || {};
  const chatModels = models.filter((m) => m.category === 'chat');
  const realtimeModels = models.filter((m) => m.category === 'realtime');

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/tiers" className="text-sm text-indigo-600 hover:text-indigo-900">
          ← Back to Tiers
        </Link>
      </div>

      <h1 className="mb-2 text-3xl font-bold">Features: {tier.name}</h1>
      <p className="mb-6 text-gray-600">
        Configure which features are enabled and which AI models to use
      </p>

      <form action={updateFeatures} className="space-y-6">
        <input type="hidden" name="id" value={tier.id} />

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium">Feature Flags & AI Models</h2>

          <div className="space-y-4">
            {FEATURES.map((feature) => {
              const isEnabled = tierFeatures[feature.key] !== false;
              const currentModel = tier[feature.modelField as keyof typeof tier] as string;
              const availableModels = feature.key === 'voice' ? realtimeModels : chatModels;

              return (
                <div
                  key={feature.key}
                  className="flex items-center justify-between border-b border-gray-100 pb-4"
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      name={`feature_${feature.key}`}
                      id={`feature_${feature.key}`}
                      defaultChecked={isEnabled}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label
                      htmlFor={`feature_${feature.key}`}
                      className="text-sm font-medium text-gray-900"
                    >
                      {feature.label}
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Model:</label>
                    <select
                      name={`model_${feature.key}`}
                      defaultValue={currentModel}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    >
                      {availableModels.length > 0 ? (
                        availableModels.map((model) => (
                          <option key={model.id} value={model.name}>
                            {model.displayName} (Q:{model.qualityScore}/5)
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="gpt-5-nano">GPT-5 Nano</option>
                          <option value="gpt-5-mini">GPT-5 Mini</option>
                          <option value="gpt-5.2-edu">GPT-5.2 Education</option>
                          <option value="gpt-5.2-chat">GPT-5.2 Chat</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-medium">Current Configuration</h2>
          <div className="grid gap-4 text-sm md:grid-cols-3">
            <div>
              <span className="font-medium">Chat Model:</span>{' '}
              <code className="rounded bg-gray-100 px-1">{tier.chatModel}</code>
            </div>
            <div>
              <span className="font-medium">Realtime Model:</span>{' '}
              <code className="rounded bg-gray-100 px-1">{tier.realtimeModel}</code>
            </div>
            <div>
              <span className="font-medium">Quiz Model:</span>{' '}
              <code className="rounded bg-gray-100 px-1">{tier.quizModel}</code>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link
            href="/admin/tiers"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Save Features
          </button>
        </div>
      </form>
    </div>
  );
}
