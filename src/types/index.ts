// ============================================================================
// MIRRORBUDDY - TYPE DEFINITIONS (Barrel Export)
// Split for maintainability - Max 250 lines per file
// ============================================================================

// Content types
export type {
  MaestroVoice,
  Subject,
  Maestro,
} from './content';

// Voice session types
export type {
  VoiceSessionState,
  VoiceConnectionState,
  VoiceSessionHandle,
  EmotionType,
  Emotion,
  TranscriptEntry,
  AudioLevels,
} from './voice';

// Education types
export type {
  QuestionType,
  Question,
  Quiz,
  QuizResult,
  CardState,
  Rating,
  Flashcard,
  FlashcardDeck,
  HomeworkStep,
  Homework,
} from './education';

// Gamification types
export type {
  MasteryTier,
  SubjectMastery,
  Streak,
  Achievement,
  Progress,
  GradeType,
  Grade,
  SubjectGrades,
  SeasonName,
  Season,
  SeasonHistory,
} from './gamification';

// User types
export type {
  Curriculum,
  SchoolLevel,
  StudentProfile,
  Theme,
  AIProvider,
  Settings,
} from './user';

// Conversation types
export type {
  ChatRole,
  SessionEvaluation,
  ChatMessageType,
  ChatMessage,
  Conversation,
} from './conversation';

// Character types
export type {
  LearningDifference,
  SupportRole,
  CharacterGender,
  ExtendedStudentProfile,
  SupportTeacher,
  BuddyProfile,
  SupportCharacter,
  CharacterType,
} from './characters';

// Parent dashboard types
export type {
  ObservationCategory,
  MaestroObservation,
  LearningStrategy,
  LearningStyleProfile,
  StudentInsights,
} from './parent';

// Ambient audio types
export type {
  AudioMode,
  AudioPreset,
  AudioPlaybackState,
  AudioLayer,
  AmbientAudioState,
} from './audio';

// Tool types
export type {
  ToolType,
  ToolState,
  ToolContext,
  ToolExecutionResult,
  ToolEventType,
  ToolCall,
  ToolResult,
  // Mindmap
  MindmapNode,
  MindmapData,
  // Quiz
  QuizQuestion,
  QuizData,
  // Demo
  DemoData,
  // Search
  SearchResult,
  SearchData,
  // Flashcard
  FlashcardItem,
  FlashcardData,
  // Summary
  SummarySection,
  SummaryData,
  // Student Summary
  InlineComment,
  StudentSummarySection,
  StudentSummaryData,
  // Diagram
  DiagramData,
  // Timeline
  TimelineEvent,
  TimelineData,
  // Tool requests
  QuizRequest,
  FlashcardDeckRequest,
  MindmapRequest,
  DiagramRequest,
  ChartRequest,
  FormulaRequest,
  CodeExecutionRequest,
  VisualizationRequest,
} from './tools';

export {
  CHAT_TOOL_DEFINITIONS,
  SUMMARY_STRUCTURE_TEMPLATE,
  createEmptyStudentSummary,
} from './tools';

// Learning Path types
export type {
  TopicStatus,
  TopicStepType,
  TopicDifficulty,
  TopicStep,
  LearningPathTopic,
  LearningPath,
  TopicProgressUpdate,
  LearningPathProgress,
} from './learning-path';
