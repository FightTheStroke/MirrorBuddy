// ============================================================================
// STUDY KIT TYPES
// Wave 2: PDF Upload -> Auto-generate study materials
// ============================================================================

import type { MindmapData, QuizData, DemoData } from './tools';

/**
 * Status of study kit generation
 */
export type StudyKitStatus = 'processing' | 'ready' | 'error';

/**
 * Complete study kit generated from a PDF
 */
export interface StudyKit {
  id: string;
  userId: string;
  sourceFile: string; // PDF filename or path
  title: string;

  // Generated materials (optional until processing completes)
  summary?: string;
  mindmap?: MindmapData;
  demo?: DemoData;
  quiz?: QuizData;

  // Processing status
  status: StudyKitStatus;
  errorMessage?: string;

  // Metadata
  subject?: string;
  pageCount?: number;
  wordCount?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request to create a study kit from PDF
 */
export interface CreateStudyKitRequest {
  title: string;
  subject?: string;
  file: File | Buffer; // File upload
}

/**
 * Response when creating a study kit
 */
export interface CreateStudyKitResponse {
  success: boolean;
  studyKitId: string;
  status: StudyKitStatus;
  error?: string;
}

/**
 * Processing progress update
 */
export interface StudyKitProgress {
  studyKitId: string;
  step: 'uploading' | 'parsing' | 'generating_summary' | 'generating_mindmap' | 'generating_demo' | 'generating_quiz' | 'complete' | 'error';
  progress: number; // 0-1
  message: string;
}
