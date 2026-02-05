/**
 * TutorBench: Pedagogical quality scoring for AI tutors.
 * Uses an LLM judge to evaluate 4 dimensions of tutoring quality
 * based on recorded maestro-student conversations.
 */

import { chatCompletion } from "@/lib/ai/providers";

export interface TutorBenchScores {
  scaffolding: number; // 0-100
  hinting: number; // 0-100
  adaptation: number; // 0-100
  misconceptionHandling: number; // 0-100
  overall: number; // weighted average
  details: DimensionDetail[];
}

interface DimensionDetail {
  dimension: string;
  score: number;
  evidence: string;
  rubricLevel: string;
}

interface ConversationTurn {
  studentMessage: string;
  maestroResponse: string;
}

const RUBRIC_LEVELS = [
  "inadequate",
  "basic",
  "competent",
  "proficient",
  "expert",
] as const;

const JUDGE_SYSTEM_PROMPT = `You are an expert pedagogical evaluator. Score the AI tutor's performance
across 4 dimensions based on the conversation transcript.

DIMENSIONS AND RUBRIC:

1. SCAFFOLDING (breaking complex problems into manageable steps)
   0-20: No scaffolding, gives full answers directly
   21-40: Occasional breakdown, but inconsistent
   41-60: Regular step-by-step guidance
   61-80: Consistent scaffolding with progressive complexity
   81-100: Expert scaffolding, dynamically adjusts granularity

2. HINTING (guiding toward answers without giving them away)
   0-20: Gives answers directly, no student discovery
   21-40: Some hints but often too obvious or too vague
   41-60: Balanced hints that sometimes lead to discovery
   61-80: Effective Socratic questioning, good hint progression
   81-100: Masterful hints, student consistently reaches insights

3. ADAPTATION (adjusting to the student's level and learning style)
   0-20: One-size-fits-all, ignores student signals
   21-40: Occasionally adjusts vocabulary or pace
   41-60: Responds to explicit difficulty signals
   61-80: Proactively adapts based on student behavior patterns
   81-100: Seamless adaptation across modality, pace, and complexity

4. MISCONCEPTION HANDLING (identifying and correcting student errors)
   0-20: Ignores errors or confirms wrong answers
   21-40: Points out errors but doesn't explain why
   41-60: Corrects with basic explanation
   61-80: Identifies root cause, explains, and verifies understanding
   81-100: Anticipates common misconceptions, prevents them proactively

RESPOND IN EXACTLY THIS JSON FORMAT:
{
  "scaffolding": { "score": <0-100>, "evidence": "<specific example>", "level": "<rubric level>" },
  "hinting": { "score": <0-100>, "evidence": "<specific example>", "level": "<rubric level>" },
  "adaptation": { "score": <0-100>, "evidence": "<specific example>", "level": "<rubric level>" },
  "misconceptionHandling": { "score": <0-100>, "evidence": "<specific example>", "level": "<rubric level>" }
}`;

/**
 * Score a conversation transcript using the TutorBench rubric.
 * Sends the full transcript to an LLM judge for evaluation.
 */
export async function scoreTutorBench(
  turns: ConversationTurn[],
  studentContext?: string,
): Promise<TutorBenchScores> {
  const transcript = turns
    .map(
      (t, i) =>
        `[Turn ${i + 1}]\nStudent: ${t.studentMessage}\nTutor: ${t.maestroResponse}`,
    )
    .join("\n\n");

  const prompt = studentContext
    ? `Student profile: ${studentContext}\n\nConversation:\n${transcript}\n\nScore this tutor's performance.`
    : `Conversation:\n${transcript}\n\nScore this tutor's performance.`;

  const result = await chatCompletion(
    [{ role: "user", content: prompt }],
    JUDGE_SYSTEM_PROMPT,
    { temperature: 0.1, maxTokens: 1024 },
  );

  return parseJudgeResponse(result.content);
}

function parseJudgeResponse(response: string): TutorBenchScores {
  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return buildDefaultScores("Failed to parse judge response");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<
      string,
      { score: number; evidence: string; level: string }
    >;

    const dimensions = [
      "scaffolding",
      "hinting",
      "adaptation",
      "misconceptionHandling",
    ];
    const details: DimensionDetail[] = dimensions.map((dim) => {
      const d = parsed[dim];
      return {
        dimension: dim,
        score: clampScore(d?.score ?? 0),
        evidence: d?.evidence ?? "No evidence provided",
        rubricLevel: validateLevel(d?.level),
      };
    });

    const scores = {
      scaffolding: details[0].score,
      hinting: details[1].score,
      adaptation: details[2].score,
      misconceptionHandling: details[3].score,
    };

    // Weighted average: scaffolding and adaptation weighted higher
    const overall = Math.round(
      scores.scaffolding * 0.3 +
        scores.hinting * 0.2 +
        scores.adaptation * 0.3 +
        scores.misconceptionHandling * 0.2,
    );

    return { ...scores, overall, details };
  } catch {
    return buildDefaultScores("Invalid JSON from judge");
  }
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function validateLevel(level: string | undefined): string {
  if (level && (RUBRIC_LEVELS as readonly string[]).includes(level)) {
    return level;
  }
  return "unknown";
}

function buildDefaultScores(reason: string): TutorBenchScores {
  const detail = (dim: string): DimensionDetail => ({
    dimension: dim,
    score: 0,
    evidence: reason,
    rubricLevel: "unknown",
  });
  return {
    scaffolding: 0,
    hinting: 0,
    adaptation: 0,
    misconceptionHandling: 0,
    overall: 0,
    details: [
      detail("scaffolding"),
      detail("hinting"),
      detail("adaptation"),
      detail("misconceptionHandling"),
    ],
  };
}
