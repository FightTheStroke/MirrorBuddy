/**
 * Client-safe Feature Flags
 *
 * Lightweight feature flag checker that does NOT import prisma/db.
 * Uses only in-memory defaults — safe for 'use client' components.
 * Server-side code should use feature-flags-service.ts instead for
 * DB-backed flags with persistence and kill-switch.
 */

import type {
  FeatureFlag,
  FeatureFlagCheckResult,
  FeatureFlagStatus,
  KnownFeatureFlag,
} from './types';

// Default feature flags (mirrors feature-flags-service.ts defaults)
const DEFAULT_FLAGS: Record<KnownFeatureFlag, Omit<FeatureFlag, 'id' | 'updatedAt'>> = {
  voice_realtime: {
    name: 'Real-time Voice',
    description: 'WebSocket-based real-time voice conversations',
    status: 'enabled',
    enabledPercentage: 100,
    killSwitch: false,
  },
  rag_enabled: {
    name: 'RAG Retrieval',
    description: 'Semantic search for conversation context',
    status: 'enabled',
    enabledPercentage: 100,
    killSwitch: false,
  },
  flashcards: {
    name: 'FSRS Flashcards',
    description: 'Spaced repetition flashcard system',
    status: 'enabled',
    enabledPercentage: 100,
    killSwitch: false,
  },
  mindmap: {
    name: 'Mind Maps',
    description: 'Interactive mind map generation',
    status: 'enabled',
    enabledPercentage: 100,
    killSwitch: false,
  },
  quiz: {
    name: 'Quiz Generation',
    description: 'AI-generated quizzes from content',
    status: 'enabled',
    enabledPercentage: 100,
    killSwitch: false,
  },
  pomodoro: {
    name: 'Pomodoro Timer',
    description: 'Focus timer with breaks',
    status: 'enabled',
    enabledPercentage: 100,
    killSwitch: false,
  },
  gamification: {
    name: 'Gamification',
    description: 'XP, levels, and achievements',
    status: 'enabled',
    enabledPercentage: 100,
    killSwitch: false,
  },
  parent_dashboard: {
    name: 'Parent Dashboard',
    description: 'Parent/professor monitoring portal',
    status: 'enabled',
    enabledPercentage: 100,
    killSwitch: false,
  },
  pdf_export: {
    name: 'PDF Export',
    description: 'Accessible PDF generation',
    status: 'enabled',
    enabledPercentage: 100,
    killSwitch: false,
  },
  ambient_audio: {
    name: 'Ambient Audio',
    description: 'Background study sounds',
    status: 'enabled',
    enabledPercentage: 100,
    killSwitch: false,
  },
  voice_ga_protocol: {
    name: 'Voice GA Protocol',
    description: 'Switch from preview to GA realtime API',
    status: 'disabled',
    enabledPercentage: 0,
    killSwitch: false,
  },
  voice_full_prompt: {
    name: 'Voice Full Prompt',
    description: 'Use full system prompt instead of truncated',
    status: 'disabled',
    enabledPercentage: 0,
    killSwitch: false,
  },
  voice_transcript_safety: {
    name: 'Voice Transcript Safety',
    description: 'Enable transcript safety checking',
    status: 'disabled',
    enabledPercentage: 0,
    killSwitch: false,
  },
  voice_calling_overlay: {
    name: 'Voice Calling Overlay',
    description: 'New calling overlay UI',
    status: 'disabled',
    enabledPercentage: 0,
    killSwitch: false,
  },
  chat_unified_view: {
    name: 'Chat Unified View',
    description: 'Unified conversation view across character types',
    status: 'disabled',
    enabledPercentage: 0,
    killSwitch: false,
  },
  consent_unified_model: {
    name: 'Consent Unified Model',
    description: 'Unified consent storage model',
    status: 'disabled',
    enabledPercentage: 0,
    killSwitch: false,
  },
};

/**
 * Client-safe feature flag check using defaults only.
 * For DB-backed checks, use the server-side feature-flags-service.
 */
export function isFeatureEnabled(featureId: KnownFeatureFlag): FeatureFlagCheckResult {
  const config = DEFAULT_FLAGS[featureId];

  if (!config) {
    return {
      enabled: false,
      reason: 'disabled',
      flag: {
        id: featureId,
        name: featureId,
        description: 'Unknown feature',
        status: 'disabled' as FeatureFlagStatus,
        enabledPercentage: 0,
        killSwitch: false,
        updatedAt: new Date(),
      },
    };
  }

  const flag: FeatureFlag = {
    id: featureId,
    ...config,
    updatedAt: new Date(),
  };

  if (flag.killSwitch) {
    return { enabled: false, reason: 'kill_switch', flag };
  }

  if (flag.status === 'disabled') {
    return { enabled: false, reason: 'disabled', flag };
  }

  if (flag.status === 'degraded') {
    return { enabled: true, reason: 'degraded', flag };
  }

  return { enabled: true, reason: 'enabled', flag };
}
