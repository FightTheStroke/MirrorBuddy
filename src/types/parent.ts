// ============================================================================
// PARENT DASHBOARD TYPES - Observations, Insights, Learning Strategies
// ============================================================================

/**
 * Observation category for what each Maestro observes.
 * Maps to the Maestro's specialty and observation focus.
 */
export type ObservationCategory =
  | 'logical_reasoning'       // Archimede
  | 'creativity'              // Leonardo
  | 'verbal_expression'       // Dante
  | 'study_method'            // Montessori
  | 'critical_thinking'       // Socrate
  | 'artistic_sensitivity'    // Mozart
  | 'scientific_curiosity'    // Darwin
  | 'spatial_memory'          // Marco Polo
  | 'historical_understanding' // Giulio Cesare
  | 'mathematical_intuition'  // Pitagora
  | 'linguistic_ability'      // Cicerone
  | 'philosophical_depth'     // Aristotele
  | 'physical_awareness'      // Ippocrate
  | 'experimental_approach'   // Galileo
  | 'environmental_awareness' // Plinio
  | 'collaborative_spirit'    // Alessandro Magno
  | 'narrative_skill';        // Omero

/**
 * Single observation from a Maestro about the student.
 */
export interface MaestroObservation {
  id: string;
  maestroId: string;
  maestroName: string;
  category: ObservationCategory;
  observation: string;
  isStrength: boolean; // true = punto di forza, false = area di crescita
  confidence: number; // 0-1, how confident the Maestro is
  createdAt: Date;
  sessionId?: string;
}

/**
 * Suggested strategy for the student.
 */
export interface LearningStrategy {
  id: string;
  title: string;
  description: string;
  suggestedBy: string[]; // Maestro IDs that suggested this
  forAreas: ObservationCategory[];
  priority: 'high' | 'medium' | 'low';
}

/**
 * Learning style profile.
 */
export interface LearningStyleProfile {
  preferredChannel: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing';
  optimalSessionDuration: number; // minutes
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening';
  motivators: string[];
  challengePreference: 'step_by_step' | 'big_picture' | 'mixed';
}

/**
 * Complete student insights for parent dashboard.
 * Aggregated from all Maestro interactions.
 */
export interface StudentInsights {
  studentId: string;
  studentName: string;
  lastUpdated: Date;
  strengths: MaestroObservation[];
  growthAreas: MaestroObservation[];
  strategies: LearningStrategy[];
  learningStyle: LearningStyleProfile;
  totalSessions: number;
  totalMinutes: number;
  maestriInteracted: string[];
}
