export interface VoiceConnectionInfo {
  provider: 'azure';
  configured: boolean;
}

export interface ExistingUserData {
  name: string;
  age?: number;
  schoolLevel?: 'elementare' | 'media' | 'superiore';
  learningDifferences?: string[];
  gender?: 'male' | 'female' | 'other';
}
