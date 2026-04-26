export interface VoiceConnectionInfo {
  provider: 'azure';
  proxyPort: number;
  configured: boolean;
}

export interface ExistingUserData {
  name: string;
  age?: number;
  schoolLevel?: 'elementare' | 'media' | 'superiore';
  learningDifferences?: string[];
  gender?: 'male' | 'female' | 'other';
}

