import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import type { VoiceToolCallResult } from '../voice-tool-commands/types';
import type {
  SetStudentNameArgs,
  SetStudentAgeArgs,
  SetSchoolLevelArgs,
  SetLearningDifferencesArgs,
  SetStudentGenderArgs,
} from './types';
import { VALID_LEARNING_DIFFERENCES } from './types';

export async function executeOnboardingTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<VoiceToolCallResult> {
  const store = useOnboardingStore.getState();

  logger.info('[OnboardingTools] Executing tool', { toolName, args });

  switch (toolName) {
    case 'set_student_name': {
      const { name } = args as unknown as SetStudentNameArgs;

      if (!name || typeof name !== 'string') {
        return {
          success: false,
          error: 'Nome non valido. Chiedi di nuovo.',
        };
      }

      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return {
          success: false,
          error: 'Il nome deve avere almeno 2 caratteri. Chiedi di nuovo.',
        };
      }

      if (trimmedName.length > 50) {
        return {
          success: false,
          error: 'Il nome è troppo lungo. Chiedi di ripetere.',
        };
      }

      store.updateData({ name: trimmedName });

      logger.info('[OnboardingTools] Student name set', { name: trimmedName });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'set_student_age': {
      const { age } = args as unknown as SetStudentAgeArgs;

      if (typeof age !== 'number' || isNaN(age)) {
        return {
          success: false,
          error: 'Età non valida. Chiedi di nuovo.',
        };
      }

      if (age < 6 || age > 19) {
        return {
          success: false,
          error: 'L\'età deve essere tra 6 e 19 anni. Chiedi di ripetere.',
        };
      }

      store.updateData({ age: Math.floor(age) });

      logger.info('[OnboardingTools] Student age set', { age });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'set_school_level': {
      const { level } = args as unknown as SetSchoolLevelArgs;

      const validLevels = ['elementare', 'media', 'superiore'];
      if (!validLevels.includes(level)) {
        return {
          success: false,
          error: 'Livello scolastico non valido. Chiedi se fa elementare, media o superiore.',
        };
      }

      store.updateData({ schoolLevel: level });

      logger.info('[OnboardingTools] School level set', { level });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'set_learning_differences': {
      const { differences } = args as unknown as SetLearningDifferencesArgs;

      if (!Array.isArray(differences)) {
        return {
          success: false,
          error: 'Formato difficoltà non valido.',
        };
      }

      const validDifferences = differences.filter((d) =>
        VALID_LEARNING_DIFFERENCES.includes(d as typeof VALID_LEARNING_DIFFERENCES[number])
      );

      store.updateData({ learningDifferences: validDifferences });

      logger.info('[OnboardingTools] Learning differences set', { validDifferences });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'set_student_gender': {
      const { gender } = args as unknown as SetStudentGenderArgs;

      const validGenders = ['male', 'female', 'other'];
      if (!validGenders.includes(gender)) {
        return {
          success: false,
          error: 'Genere non valido.',
        };
      }

      store.updateData({ gender });

      logger.info('[OnboardingTools] Student gender set', { gender });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'confirm_step_data': {
      const data = store.data;

      logger.info('[OnboardingTools] Confirm step data', { data });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'next_onboarding_step': {
      store.nextStep();

      logger.info('[OnboardingTools] Advanced to next step', {
        newStep: store.currentStep,
      });
      return {
        success: true,
        displayed: true,
      };
    }

    case 'prev_onboarding_step': {
      store.prevStep();

      logger.info('[OnboardingTools] Went back to previous step', {
        newStep: store.currentStep,
      });
      return {
        success: true,
        displayed: true,
      };
    }

    default:
      logger.warn('[OnboardingTools] Unknown tool', { toolName });
      return {
        success: false,
        error: `Tool sconosciuto: ${toolName}`,
      };
  }
}

