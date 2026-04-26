// ============================================================================
// MAESTRO EVALUATION
// AI-generated evaluation of student session performance
// Part of Session Summary & Unified Archive feature
// Supports per-feature AI config (ADR 0073)
// ============================================================================

import {
  chatCompletion,
  getActiveProvider,
  getDeploymentForModel,
} from "@/lib/ai/server";
import { tierService } from "@/lib/tier/server";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/db";

interface Message {
  role: string;
  content: string;
}

interface StudentProfile {
  name?: string;
  age?: number;
  schoolYear?: number;
  schoolLevel?: string;
  learningGoals?: string[];
}

export interface MaestroEvaluation {
  score: number; // 1-10
  feedback: string;
  strengths: string[];
  areasToImprove: string[];
}

/**
 * Generate AI Maestro evaluation of a session
 */
export async function generateMaestroEvaluation(
  messages: Message[],
  studentProfile?: StudentProfile,
  userId?: string, // For tier-based AI config (ADR 0073)
): Promise<MaestroEvaluation> {
  const provider = getActiveProvider();
  if (!provider) {
    return {
      score: 5,
      feedback: "Valutazione non disponibile",
      strengths: [],
      areasToImprove: [],
    };
  }

  const profileInfo = studentProfile
    ? `
Profilo studente:
- Nome: ${studentProfile.name || "Non specificato"}
- Età: ${studentProfile.age || "Non specificata"}
- Anno scolastico: ${studentProfile.schoolYear || "Non specificato"}
- Livello: ${studentProfile.schoolLevel || "Non specificato"}
`
    : "";

  const systemPrompt = `Sei un maestro che valuta una sessione di studio.
Analizza la conversazione e fornisci una valutazione COSTRUTTIVA e INCORAGGIANTE.

${profileInfo}

Rispondi SOLO con JSON valido in questo formato:
{
  "score": <numero da 1 a 10>,
  "feedback": "<feedback costruttivo di 1-2 frasi, tono positivo>",
  "strengths": ["<punto di forza 1>", "<punto di forza 2>"],
  "areasToImprove": ["<area di miglioramento 1>"]
}

Criteri di valutazione:
- 1-3: Sessione molto breve o con poca partecipazione
- 4-5: Sessione base, ha fatto domande semplici
- 6-7: Buona partecipazione, ha mostrato interesse
- 8-9: Ottima partecipazione, ha fatto domande approfondite
- 10: Eccezionale, ha mostrato comprensione profonda

IMPORTANTE:
- Sii SEMPRE incoraggiante, mai critico
- Evidenzia anche i piccoli progressi
- Max 2 strengths e 1-2 areasToImprove
- Il feedback deve essere motivante`;

  const conversationText = messages
    .slice(-30) // Limit to last 30 messages for evaluation
    .map((m) => `${m.role === "user" ? "STUDENTE" : "MAESTRO"}: ${m.content}`)
    .join("\n\n");

  const userPrompt = `Valuta questa sessione di studio:

${conversationText}`;

  // Get AI config from tier (ADR 0073)
  const aiConfig = await tierService.getFeatureAIConfigForUser(
    userId ?? null,
    "chat",
  );
  const deploymentName = getDeploymentForModel(aiConfig.model);

  try {
    const result = await chatCompletion(
      [{ role: "user", content: userPrompt }],
      systemPrompt,
      {
        temperature: aiConfig.temperature,
        maxTokens: aiConfig.maxTokens,
        model: deploymentName,
      },
    );

    // Parse JSON from response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as MaestroEvaluation;

      // Validate and normalize
      return {
        score: Math.max(1, Math.min(10, Math.round(parsed.score))),
        feedback: parsed.feedback || "Buon lavoro!",
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths.slice(0, 3)
          : [],
        areasToImprove: Array.isArray(parsed.areasToImprove)
          ? parsed.areasToImprove.slice(0, 2)
          : [],
      };
    }
  } catch (error) {
    logger.error("Failed to generate maestro evaluation", {
      error: String(error),
    });
  }

  // Fallback evaluation
  return {
    score: 6,
    feedback: "Hai fatto un buon lavoro in questa sessione!",
    strengths: ["Hai partecipato attivamente"],
    areasToImprove: [],
  };
}

/**
 * Save evaluation to a study session
 */
export async function saveSessionEvaluation(
  sessionId: string,
  evaluation: MaestroEvaluation,
): Promise<void> {
  await prisma.studySession.update({
    where: { id: sessionId },
    data: {
      maestroScore: evaluation.score,
      maestroFeedback: evaluation.feedback,
      strengths: JSON.stringify(evaluation.strengths),
      areasToImprove: JSON.stringify(evaluation.areasToImprove),
    },
  });

  logger.info("Session evaluation saved", {
    sessionId,
    score: evaluation.score,
  });
}

/**
 * Save student self-rating to a study session
 */
export async function saveStudentRating(
  sessionId: string,
  rating: number,
  feedback?: string,
): Promise<void> {
  if (rating < 1 || rating > 5) {
    throw new Error("Student rating must be between 1 and 5");
  }

  await prisma.studySession.update({
    where: { id: sessionId },
    data: {
      studentRating: rating,
      studentFeedback: feedback || null,
    },
  });

  logger.info("Student rating saved", {
    sessionId,
    rating,
  });
}

/**
 * Get evaluation for a session
 */
export async function getSessionEvaluation(sessionId: string): Promise<{
  maestro: MaestroEvaluation | null;
  student: { rating: number; feedback: string | null } | null;
} | null> {
  const session = await prisma.studySession.findUnique({
    where: { id: sessionId },
    select: {
      studentRating: true,
      studentFeedback: true,
      maestroScore: true,
      maestroFeedback: true,
      strengths: true,
      areasToImprove: true,
    },
  });

  if (!session) return null;

  return {
    maestro: session.maestroScore
      ? {
          score: session.maestroScore,
          feedback: session.maestroFeedback || "",
          strengths: session.strengths ? JSON.parse(session.strengths) : [],
          areasToImprove: session.areasToImprove
            ? JSON.parse(session.areasToImprove)
            : [],
        }
      : null,
    student: session.studentRating
      ? {
          rating: session.studentRating,
          feedback: session.studentFeedback,
        }
      : null,
  };
}
