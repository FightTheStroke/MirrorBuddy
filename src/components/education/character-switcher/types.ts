export type CharacterRole = 'learning_coach' | 'buddy' | 'maestro';

export interface Character {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: CharacterRole;
  description: string;
  specialty?: string;
  greeting: string;
  systemPrompt: string;
}

