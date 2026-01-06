import type { Maestro, Subject, MaestroVoice } from '@/types';
import {
  generateMelissaOnboardingPrompt,
  MELISSA_ONBOARDING_VOICE_INSTRUCTIONS,
  type ExistingUserDataForPrompt,
} from '@/lib/voice/onboarding-tools';

/**
 * Create Melissa maestro for onboarding with specialized prompts.
 * If existingUserData is provided, Melissa will greet them by name and ask if they want to update.
 */
export function createOnboardingMelissa(
  existingUserData?: ExistingUserDataForPrompt | null
): Maestro {
  const isReturningUser = Boolean(existingUserData?.name);

  return {
    id: 'melissa-onboarding',
    name: 'Melissa',
    subject: 'methodology' as Subject,
    specialty: 'Learning Coach - Onboarding',
    voice: 'shimmer' as MaestroVoice,
    voiceInstructions: MELISSA_ONBOARDING_VOICE_INSTRUCTIONS,
    teachingStyle: 'scaffolding',
    avatar: '/avatars/melissa.jpg',
    color: '#EC4899',
    systemPrompt: generateMelissaOnboardingPrompt(existingUserData),
    greeting: isReturningUser
      ? `Ciao ${existingUserData?.name}! È bello rivederti! Ho già le tue informazioni. Vuoi cambiare qualcosa o andiamo avanti?`
      : 'Ciao! Sono Melissa, piacere di conoscerti! Come ti chiami?',
  };
}

