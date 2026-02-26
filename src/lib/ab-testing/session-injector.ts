import { prisma } from '@/lib/db';
import { getActiveExperiments, resolveUserBucket } from './ab-service';

export interface ABModelOverride {
  experimentId: string;
  bucketLabel: string;
  modelProvider: string;
  modelName: string;
  extraConfig: unknown;
}

export async function injectABMetadata(
  userId: string,
  conversationId: string,
): Promise<ABModelOverride | null> {
  if (!userId) {
    throw new Error('userId is required');
  }
  if (!conversationId) {
    throw new Error('conversationId is required');
  }

  const activeExperiments = await getActiveExperiments();
  const activeExperiment = activeExperiments[0];

  if (!activeExperiment) {
    return null;
  }

  const resolvedBucket = await resolveUserBucket(userId, activeExperiment.id);

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      abExperimentId: activeExperiment.id,
      abBucketLabel: resolvedBucket.bucketLabel,
    },
  });

  return {
    experimentId: activeExperiment.id,
    bucketLabel: resolvedBucket.bucketLabel,
    modelProvider: resolvedBucket.modelProvider,
    modelName: resolvedBucket.modelName,
    extraConfig: resolvedBucket.extraConfig,
  };
}
