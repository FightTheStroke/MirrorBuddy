// ============================================================================
// STUDENT INTERACTION TOOL DATA TYPES
// Student Summary (maieutic method - student writes, AI guides)
// Issue #70: Collaborative summary writing
// ============================================================================

/**
 * Inline comment from Maestro on student's text
 */
export interface InlineComment {
  id: string;
  startOffset: number;
  endOffset: number;
  text: string;
  maestroId: string;
  createdAt: Date;
  resolved?: boolean;
}

/**
 * A guided section in student's summary
 */
export interface StudentSummarySection {
  id: string;
  heading: string;
  guidingQuestion: string;
  content: string;
  comments: InlineComment[];
}

/**
 * Student-written summary
 */
export interface StudentSummaryData {
  id: string;
  title: string;
  topic: string;
  sections: StudentSummarySection[];
  wordCount: number;
  createdAt: Date;
  lastModifiedAt: Date;
  maestroId?: string;
  sessionId?: string;
}

/**
 * Default guided structure template
 */
export const SUMMARY_STRUCTURE_TEMPLATE: Omit<StudentSummarySection, 'comments'>[] = [
  {
    id: 'intro',
    heading: 'Introduzione',
    guidingQuestion: 'Di cosa parla questo argomento? Qual è il tema principale?',
    content: '',
  },
  {
    id: 'main',
    heading: 'Sviluppo',
    guidingQuestion: 'Quali sono i punti chiave? Cosa hai capito di importante?',
    content: '',
  },
  {
    id: 'conclusion',
    heading: 'Conclusione',
    guidingQuestion: 'Quali conclusioni puoi trarre? Cosa è importante ricordare?',
    content: '',
  },
];

/**
 * Creates a new empty student summary
 */
export function createEmptyStudentSummary(
  topic: string,
  maestroId?: string,
  sessionId?: string
): StudentSummaryData {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    title: topic,
    topic,
    sections: SUMMARY_STRUCTURE_TEMPLATE.map((section) => ({
      ...section,
      comments: [],
    })),
    wordCount: 0,
    createdAt: now,
    lastModifiedAt: now,
    maestroId,
    sessionId,
  };
}
