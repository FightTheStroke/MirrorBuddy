import type { DetectedIntent, CharacterType } from './types';
import { detectSubject, detectEmotions, isCrisis, isMethodRequest, isToolRequest, isTechSupport, detectToolType } from './detectors';

export function detectIntent(message: string): DetectedIntent {
  const normalizedMessage = message.toLowerCase().trim();

  if (isCrisis(normalizedMessage)) {
    return {
      type: 'crisis',
      confidence: 1.0,
      emotionalIndicators: ['sadness', 'loneliness'],
      recommendedCharacter: 'buddy',
      reason: 'Crisis keywords detected - needs immediate support and adult referral',
    };
  }

  const subject = detectSubject(normalizedMessage);
  const emotions = detectEmotions(normalizedMessage);
  const wantsMethod = isMethodRequest(normalizedMessage);
  const wantsTool = isToolRequest(normalizedMessage);
  const wantsTechSupport = isTechSupport(normalizedMessage);

  if (wantsTechSupport && !subject) {
    return {
      type: 'tech_support',
      confidence: 0.85,
      emotionalIndicators: emotions,
      recommendedCharacter: 'coach',
      reason: 'Technical support with app features - coach will use knowledge base',
    };
  }

  const hasStrongNegativeEmotion = emotions.some((e) =>
    ['frustration', 'anxiety', 'sadness', 'loneliness', 'overwhelm'].includes(e)
  );

  if (wantsMethod) {
    return {
      type: 'method_help',
      confidence: 0.8,
      subject,
      emotionalIndicators: emotions,
      recommendedCharacter: 'coach',
      reason: 'Requesting study method or organization help',
    };
  }

  if (emotions.length >= 2 && hasStrongNegativeEmotion && !subject) {
    return {
      type: 'emotional_support',
      confidence: 0.85,
      emotionalIndicators: emotions,
      recommendedCharacter: 'buddy',
      reason: 'Multiple emotional indicators without specific academic focus',
    };
  }

  if (wantsTool && subject) {
    const toolType = detectToolType(normalizedMessage);
    return {
      type: 'tool_request',
      confidence: 0.8,
      subject,
      toolType: toolType ?? undefined,
      emotionalIndicators: emotions,
      recommendedCharacter: 'maestro',
      reason: `Tool creation request (${toolType || 'unspecified'}) for specific subject`,
    };
  }

  if (wantsTool) {
    const toolType = detectToolType(normalizedMessage);
    return {
      type: 'tool_request',
      confidence: 0.7,
      toolType: toolType ?? undefined,
      emotionalIndicators: emotions,
      recommendedCharacter: 'coach',
      reason: `Tool creation request (${toolType || 'unspecified'}) - coach can help identify subject`,
    };
  }

  if (subject) {
    return {
      type: 'academic_help',
      confidence: 0.75,
      subject,
      emotionalIndicators: emotions,
      recommendedCharacter: 'maestro',
      reason: hasStrongNegativeEmotion
        ? 'Subject help needed, but may benefit from emotional acknowledgment first'
        : 'Clear academic question for subject expert',
    };
  }

  if (hasStrongNegativeEmotion) {
    return {
      type: 'emotional_support',
      confidence: 0.7,
      emotionalIndicators: emotions,
      recommendedCharacter: 'buddy',
      reason: 'Emotional support needed without specific academic content',
    };
  }

  return {
    type: 'general_chat',
    confidence: 0.5,
    emotionalIndicators: emotions,
    recommendedCharacter: 'coach',
    reason: 'General conversation - coach can help identify needs',
  };
}

export function getCharacterTypeLabel(type: CharacterType): string {
  switch (type) {
    case 'maestro':
      return 'Professore';
    case 'coach':
      return 'Il tuo Coach';
    case 'buddy':
      return 'Il tuo Buddy';
  }
}

export function shouldSuggestRedirect(
  intent: DetectedIntent,
  currentCharacter: CharacterType
): { should: boolean; suggestion?: string } {
  if (intent.recommendedCharacter === currentCharacter) {
    return { should: false };
  }

  if (intent.confidence < 0.7) {
    return { should: false };
  }

  const suggestions: Record<CharacterType, string> = {
    maestro: `Per questa domanda di ${intent.subject || 'materia'}, un Professore potrebbe aiutarti meglio!`,
    coach: 'Per organizzare meglio lo studio, il tuo Coach puo\' aiutarti!',
    buddy: 'Se vuoi parlare con qualcuno che ti capisce, il tuo Buddy e\' qui!',
  };

  return {
    should: true,
    suggestion: suggestions[intent.recommendedCharacter],
  };
}

