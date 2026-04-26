export interface SetStudentNameArgs {
  name: string;
}

export interface SetStudentAgeArgs {
  age: number;
}

export interface SetSchoolLevelArgs {
  level: 'elementare' | 'media' | 'superiore';
}

export interface SetLearningDifferencesArgs {
  differences: string[];
}

export interface SetStudentGenderArgs {
  gender: 'male' | 'female' | 'other';
}

export interface ExistingUserDataForPrompt {
  name?: string;
  age?: number;
  schoolLevel?: 'elementare' | 'media' | 'superiore';
  learningDifferences?: string[];
}

export const VALID_LEARNING_DIFFERENCES = [
  'dyslexia',
  'dyscalculia',
  'dysgraphia',
  'adhd',
  'autism',
  'cerebralPalsy',
  'visualImpairment',
  'auditoryProcessing',
] as const;

