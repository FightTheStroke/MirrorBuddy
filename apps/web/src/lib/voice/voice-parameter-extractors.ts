import type { ExtractionContext } from './voice-parameter-types';
import {
  DIFFICULTY_PATTERNS,
  extractNumbers,
  extractTopic,
  extractDifficulty,
  extractLength,
  extractChartType,
  calculateConfidence,
} from './voice-parameter-patterns';

/**
 * Tool-specific parameter schemas
 */
interface ToolParameterSchema {
  extractParams: (
    transcript: string,
    context?: ExtractionContext,
  ) => { params: Record<string, unknown>; confidence: number };
}

// ============================================================================
// TOOL-SPECIFIC EXTRACTORS
// ============================================================================

export const TOOL_EXTRACTORS: Record<string, ToolParameterSchema> = {
  quiz: {
    extractParams: (transcript, context) => {
      const numbers = extractNumbers(transcript);
      const topic = extractTopic(transcript);
      const difficulty = extractDifficulty(transcript);

      // Question count: look for numbers, default to 5
      let questionCount = 5;
      if (numbers.length > 0) {
        // If multiple numbers, prefer the LAST one that looks like question count
        // "3 quiz con 5 domande" -> we want 5
        const validCounts = numbers.filter((n) => n >= 3 && n <= 20);
        if (validCounts.length > 0) {
          questionCount = validCounts[validCounts.length - 1];
        }
      }

      // Fallback to context if no topic found
      const finalTopic = topic || context?.conversationTopics?.[0] || 'argomento generale';

      const params: Record<string, unknown> = {
        topic: finalTopic,
        questionCount,
      };

      if (difficulty) {
        params.difficulty = difficulty;
      }

      const hasExplicitTopic = topic !== null;
      const hasContextFallback = !topic && context?.conversationTopics?.[0];
      const paramsCount = Object.keys(params).length;
      const transcriptEmpty = transcript.trim().length === 0;
      let confidence = calculateConfidence(paramsCount, 3, hasExplicitTopic, transcriptEmpty);

      // Boost confidence if using context successfully
      if (hasContextFallback) {
        confidence = Math.max(confidence, 0.6);
      }

      return { params, confidence };
    },
  },

  flashcard: {
    extractParams: (transcript, context) => {
      const numbers = extractNumbers(transcript);
      const topic = extractTopic(transcript);

      // Card count: default to 8
      const count = numbers.find((n) => n >= 3 && n <= 30) || 8;

      const finalTopic = topic || context?.conversationTopics?.[0] || 'argomento generale';

      const params: Record<string, unknown> = {
        topic: finalTopic,
        count,
      };

      const hasExplicitTopic = topic !== null;
      const confidence = calculateConfidence(2, 2, hasExplicitTopic);

      return { params, confidence };
    },
  },

  mindmap: {
    extractParams: (transcript, context) => {
      const topic = extractTopic(transcript);

      const finalTopic = topic || context?.conversationTopics?.[0] || 'concetto centrale';

      const params: Record<string, unknown> = {
        title: finalTopic,
      };

      const hasExplicitTopic = topic !== null;
      const transcriptEmpty = transcript.trim().length === 0;

      // If using context fallback, reduce confidence
      let confidence = calculateConfidence(1, 1, hasExplicitTopic, transcriptEmpty);
      if (!hasExplicitTopic && context?.conversationTopics?.[0]) {
        confidence = 0.6; // Medium confidence with context fallback
      }

      return { params, confidence };
    },
  },

  formula: {
    extractParams: (transcript, context) => {
      const topic = extractTopic(transcript);

      // Use topic from extractTopic() which already handles full phrases
      const finalDescription =
        topic || context?.conversationTopics?.[0] || context?.maestroSubject || 'formula';

      const params: Record<string, unknown> = {
        description: finalDescription,
      };

      const hasExplicitTopic = topic !== null;
      const confidence = calculateConfidence(1, 1, hasExplicitTopic);

      return { params, confidence: Math.max(confidence, 0.5) };
    },
  },

  chart: {
    extractParams: (transcript, context) => {
      const chartType = extractChartType(transcript);
      const topic = extractTopic(transcript);

      // Use topic from extractTopic() which already handles full phrases
      const title = topic || context?.conversationTopics?.[0] || 'dati';

      const params: Record<string, unknown> = {
        chartType,
        title,
      };

      const hasExplicitTopic = topic !== null;
      const confidence = calculateConfidence(2, 2, hasExplicitTopic);

      return { params, confidence };
    },
  },

  summary: {
    extractParams: (transcript, context) => {
      const topic = extractTopic(transcript);
      const length = extractLength(transcript);

      const finalTopic = topic || context?.conversationTopics?.join(', ') || 'argomento';

      const params: Record<string, unknown> = {
        topic: finalTopic,
      };

      if (length) {
        params.length = length;
      }

      const hasExplicitTopic = topic !== null;
      const paramsCount = Object.keys(params).length;
      const confidence = calculateConfidence(paramsCount, 2, hasExplicitTopic);

      return { params, confidence };
    },
  },

  homework: {
    extractParams: (transcript, context) => {
      const topic = extractTopic(transcript);

      // Extract subject from patterns like "compiti di matematica"
      const subjectMatch = transcript.match(/compiti\s+di\s+([a-zàèéìòù\s]+)/i);
      const subject = subjectMatch?.[1]?.trim() || topic;

      const finalTopic = subject || context?.maestroSubject || 'compiti generali';

      const params: Record<string, unknown> = {
        topic: finalTopic,
      };

      // Check for difficulty
      if (DIFFICULTY_PATTERNS.hard.test(transcript)) {
        params.difficulty = 'hard';
      } else if (DIFFICULTY_PATTERNS.easy.test(transcript)) {
        params.difficulty = 'easy';
      }

      const hasExplicitTopic = subject !== null;
      const paramsCount = Object.keys(params).length;
      const confidence = calculateConfidence(paramsCount, 2, hasExplicitTopic);

      return { params, confidence: Math.max(confidence, 0.5) };
    },
  },

  // PDF and Webcam tools don't extract parameters from voice
  pdf: {
    extractParams: () => ({ params: {}, confidence: 0.5 }),
  },

  webcam: {
    extractParams: () => ({ params: {}, confidence: 0.5 }),
  },
};
