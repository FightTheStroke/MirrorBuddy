// ============================================================================
// CONVERGIO WEB - TYPE DEFINITIONS
// Migrated from ConvergioApp native macOS application
// ============================================================================

// === MAESTRO TYPES ===

export type MaestroVoice =
  | 'alloy'
  | 'ash'
  | 'ballad'
  | 'coral'
  | 'echo'
  | 'sage'
  | 'shimmer'
  | 'verse';

export type Subject =
  | 'mathematics'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'history'
  | 'geography'
  | 'italian'
  | 'english'
  | 'art'
  | 'music'
  | 'civics'
  | 'economics'
  | 'computerScience'
  | 'health'
  | 'philosophy'
  | 'internationalLaw';

export interface Maestro {
  id: string;
  name: string;
  subject: Subject;
  specialty: string;
  voice: MaestroVoice;
  voiceInstructions: string;  // How to speak/personality for voice
  teachingStyle: string;
  avatar: string;
  color: string;
  systemPrompt: string;
  greeting: string;
}

// === VOICE SESSION TYPES ===

export type VoiceSessionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error';

export type EmotionType =
  | 'neutral'
  | 'joy'
  | 'excitement'
  | 'curiosity'
  | 'confusion'
  | 'frustration'
  | 'anxiety'
  | 'boredom'
  | 'distraction';

export interface Emotion {
  type: EmotionType;
  confidence: number;
  color: string;
}

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: Emotion;
}

export interface AudioLevels {
  input: number;
  output: number;
}

// === EDUCATION TYPES ===

export type QuestionType = 'multiple_choice' | 'true_false' | 'open_ended';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | number;
  hints: string[];
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  subject: Subject;
  topic: string;
}

export interface Quiz {
  id: string;
  title: string;
  subject: Subject;
  questions: Question[];
  timeLimit?: number; // seconds
  masteryThreshold: number; // 0-100
  xpReward: number;
}

export interface QuizResult {
  quizId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  masteryAchieved: boolean;
  xpEarned: number;
  completedAt: Date;
}

// === FLASHCARD TYPES (FSRS-5) ===

export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  state: CardState;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  lastReview?: Date;
  nextReview: Date;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  subject: Subject;
  cards: Flashcard[];
  createdAt: Date;
  lastStudied?: Date;
}

// === HOMEWORK TYPES ===

export interface HomeworkStep {
  id: string;
  description: string;
  hints: string[]; // 3 progressive hints
  studentNotes: string;
  completed: boolean;
}

export interface Homework {
  id: string;
  title: string;
  subject: Subject;
  problemType: string;
  steps: HomeworkStep[];
  photoUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

// === GAMIFICATION TYPES ===

export type MasteryTier =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'master';

export interface SubjectMastery {
  subject: Subject;
  percentage: number;
  tier: MasteryTier;
  topicsCompleted: number;
  totalTopics: number;
  lastStudied?: Date;
}

export interface Streak {
  current: number;
  longest: number;
  lastStudyDate?: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'study' | 'mastery' | 'streak' | 'social' | 'exploration' | 'xp';
  requirement: number;
  xpReward: number;
  unlockedAt?: Date;
}

export interface Progress {
  xp: number;
  level: number;
  xpToNextLevel: number;
  streak: Streak;
  masteries: SubjectMastery[];
  achievements: Achievement[];
  totalStudyMinutes: number;
  sessionsThisWeek: number;
  questionsAsked: number;
}

// === GRADE TYPES (Italian System) ===

export type GradeType =
  | 'quiz'
  | 'homework'
  | 'test'
  | 'participation'
  | 'project'
  | 'oral';

export interface Grade {
  id: string;
  value: number; // 1-10 Italian scale
  subject: Subject;
  type: GradeType;
  description: string;
  date: Date;
}

export interface SubjectGrades {
  subject: Subject;
  grades: Grade[];
  average: number;
  trend: 'improving' | 'stable' | 'declining';
}

// === STUDENT PROFILE TYPES ===

export type Curriculum =
  | 'liceoClassico'
  | 'liceoScientifico'
  | 'liceoLinguistico'
  | 'liceoArtistico'
  | 'liceoMusicale'
  | 'istitutoTecnico'
  | 'istitutoProfessionale'
  | 'scuolaMedia'
  | 'scuolaElementare';

export type SchoolLevel = 'elementare' | 'media' | 'superiore';

export interface StudentProfile {
  name: string;
  age: number;
  schoolYear: number;
  schoolLevel: SchoolLevel;
  curriculum?: Curriculum;
  // Accessibility
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  dyslexiaFont: boolean;
  voiceEnabled: boolean;
  simplifiedLanguage: boolean;
  adhdMode: boolean;
}

// === SETTINGS TYPES ===

export type Theme = 'light' | 'dark' | 'system';

export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'azure'
  | 'gemini'
  | 'openrouter'
  | 'perplexity'
  | 'grok'
  | 'ollama';

export interface Settings {
  theme: Theme;
  provider: AIProvider;
  model: string;
  budgetLimit: number;
  studentProfile: StudentProfile;
}

// === TOOL TYPES ===

export type ToolType =
  | 'run_code'
  | 'create_chart'
  | 'create_diagram'
  | 'create_visualization'
  | 'show_formula'
  | 'create_quiz'
  | 'create_flashcard'
  | 'create_mindmap';

export interface ToolCall {
  id: string;
  type: ToolType;
  name: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: ToolResult;
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: unknown;
  renderComponent?: string; // Component name to render
}

export interface CodeExecutionRequest {
  language: 'python' | 'javascript';
  code: string;
  timeout?: number;
}

export interface ChartRequest {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      color?: string;
    }>;
  };
}

export interface DiagramRequest {
  type: 'flowchart' | 'sequence' | 'class' | 'state' | 'er';
  code: string; // Mermaid syntax (mind maps use MarkMap via create_mindmap tool)
  title?: string;
}

export interface FormulaRequest {
  latex: string;
  description?: string;
}

export interface VisualizationRequest {
  type: 'physics' | 'math' | 'chemistry' | 'biology';
  name: string;
  params: Record<string, number | string>;
}

export interface QuizRequest {
  title: string;
  subject: Subject;
  questions: Array<{
    text: string;
    type: QuestionType;
    options?: string[];
    correctAnswer: string | number;
    hints: string[];
    explanation: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    topic: string;
  }>;
  masteryThreshold?: number;
  xpReward?: number;
}

export interface FlashcardDeckRequest {
  name: string;
  subject: Subject;
  cards: Array<{
    front: string;
    back: string;
  }>;
}

export interface MindmapRequest {
  title: string;
  nodes: Array<{
    id: string;
    label: string;
    children?: Array<{
      id: string;
      label: string;
      children?: Array<{
        id: string;
        label: string;
      }>;
    }>;
    icon?: string;
    color?: string;
  }>;
}

// === CHAT TYPES ===

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  tokens?: number;
  cost?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  maestroId?: string;
  systemPrompt?: string;
  createdAt: Date;
  updatedAt: Date;
}

// === SUPPORT CHARACTER TYPES (MirrorBuddy v2.0) ===

/**
 * Learning differences that the platform supports.
 * Used for both student profiles and buddy matching.
 */
export type LearningDifference =
  | 'dyslexia'
  | 'dyscalculia'
  | 'dysgraphia'
  | 'adhd'
  | 'autism'
  | 'cerebralPalsy'
  | 'visualImpairment'
  | 'auditoryProcessing';

/**
 * Role of support characters in the Support Triangle.
 */
export type SupportRole = 'learning_coach' | 'peer_buddy';

/**
 * Gender option for support characters.
 * Students can choose their preferred coach/buddy gender.
 */
export type CharacterGender = 'male' | 'female';

/**
 * Extended student profile with learning differences.
 * Used by Mario/Maria buddies to personalize their approach.
 */
export interface ExtendedStudentProfile extends StudentProfile {
  learningDifferences: LearningDifference[];
  preferredCoach?: 'melissa' | 'davide';
  preferredBuddy?: 'mario' | 'maria';
}

/**
 * Support Teacher (Melissa/Davide) - Learning Coach role.
 * Focus: develop autonomy and study method.
 * Relationship: vertical (coach), but talks "alongside" not "from above".
 */
export interface SupportTeacher {
  id: 'melissa' | 'davide';
  name: string;
  gender: CharacterGender;
  age: number;
  personality: string;
  role: 'learning_coach';
  voice: MaestroVoice;
  voiceInstructions: string;
  systemPrompt: string;
  greeting: string;
  avatar: string;
  color: string;
}

/**
 * MirrorBuddy (Mario/Maria) - Peer Support role.
 * Focus: make student feel less alone.
 * Relationship: horizontal (friend), speaks as peer.
 *
 * System prompt is dynamic based on student profile:
 * - Age is always student.age + 1
 * - Learning differences mirror the student's
 */
export interface BuddyProfile {
  id: 'mario' | 'maria';
  name: string;
  gender: CharacterGender;
  ageOffset: number; // Always 1 (one year older)
  personality: string;
  role: 'peer_buddy';
  voice: MaestroVoice;
  voiceInstructions: string;
  /**
   * Dynamic system prompt generator.
   * Takes student profile to personalize Mario/Maria's background.
   */
  getSystemPrompt: (student: ExtendedStudentProfile) => string;
  /**
   * Dynamic greeting generator.
   */
  getGreeting: (student: ExtendedStudentProfile) => string;
  avatar: string;
  color: string;
}

/**
 * Union type for any support character (coach or buddy).
 */
export type SupportCharacter = SupportTeacher | BuddyProfile;

/**
 * Character type identifier for routing.
 */
export type CharacterType = 'maestro' | 'coach' | 'buddy';
