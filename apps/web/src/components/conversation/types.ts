export interface UnifiedChatView {
  characterType: 'maestro' | 'coach' | 'buddy';
  voiceEnabled: boolean;
  handoffEnabled: boolean;
  featureToggles: {
    tools: boolean;
    rag: boolean;
    learningPath: boolean;
    webcam: boolean;
  };
}

export interface UnifiedChatProps {
  contract: UnifiedChatView;
  onHandoff?: (targetCharacterId: string) => void;
}
