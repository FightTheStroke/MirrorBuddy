/**
 * AI-Powered Learning Recommendation Scoring
 *
 * Generates AI-scored recommendations from student insights
 * Part of recommendation-engine module
 *
 * Plan 104 - Wave 4: Pro Features [T4-05]
 */

// eslint-disable-next-line local-rules/enforce-dependency-direction -- Pro tier gating (ADR 0065)
import { tierService } from "@/lib/tier";
import { chatCompletion, getDeploymentForModel } from "@/lib/ai";
import type { StudentInsights } from "./recommendation-insights";

/**
 * AI-scored learning recommendation
 */
export interface LearningRecommendation {
  strengths: string[];
  weaknesses: string[];
  recommendedTopics: string[];
  focusAreas: string[];
  overallScore: number;
  confidenceLevel: "low" | "medium" | "high";
}

/**
 * Generate AI recommendations from student insights
 */
export async function generateAIRecommendations(
  userId: string,
  insights: StudentInsights,
): Promise<LearningRecommendation> {
  const prompt = `Analizza i dati di apprendimento di questo studente e genera raccomandazioni personalizzate.

DATI STUDENTE:
- Conversazioni totali: ${insights.conversationCount}
- Durata media sessione: ${insights.averageSessionLength} minuti
- Materie principali: ${insights.topSubjects.join(", ")}
- Progresso learning path: ${insights.learningPathProgress}%
- Accuratezza flashcard (FSRS): ${insights.fsrsAccuracy}%
- Review totali: ${insights.totalReviews}
- Aree di forza: ${insights.strengthAreas.join(", ") || "nessuna"}
- Aree deboli: ${insights.weakAreas.join(", ") || "nessuna"}

ISTRUZIONI:
1. Identifica 2-4 punti di forza (strengths)
2. Identifica 2-4 aree di miglioramento (weaknesses)
3. Suggerisci 3-5 argomenti da studiare successivamente (recommendedTopics)
4. Suggerisci 3-5 aree su cui concentrarsi (focusAreas) - azioni concrete
5. Calcola un punteggio complessivo 0-100 (overallScore) basato su:
   - Consistenza nello studio
   - Progresso nei learning path
   - Accuratezza nelle review
   - Ampiezza delle materie studiate
6. Indica il livello di confidenza: low (< 20 dati), medium (20-50 dati), high (> 50 dati)

Rispondi SOLO con JSON valido in questo formato:
{
  "strengths": ["punto di forza 1", "punto di forza 2"],
  "weaknesses": ["area debole 1", "area debole 2"],
  "recommendedTopics": ["argomento 1", "argomento 2"],
  "focusAreas": ["azione concreta 1", "azione concreta 2"],
  "overallScore": 75,
  "confidenceLevel": "high"
}`;

  const aiConfig = await tierService.getFeatureAIConfigForUser(userId, "chat");
  const deploymentName = getDeploymentForModel(aiConfig.model);

  const result = await chatCompletion(
    [{ role: "user", content: prompt }],
    "Sei un pedagogista esperto in didattica personalizzata. Rispondi SOLO con JSON valido.",
    {
      temperature: aiConfig.temperature,
      maxTokens: aiConfig.maxTokens,
      model: deploymentName,
    },
  );

  // Parse AI response
  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI recommendation response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    recommendedTopics: parsed.recommendedTopics || [],
    focusAreas: parsed.focusAreas || [],
    overallScore: parsed.overallScore || scoreLearningPattern(insights),
    confidenceLevel: parsed.confidenceLevel || "low",
  };
}

/**
 * Calculate learning score from insights (fallback when AI fails)
 */
export function scoreLearningPattern(insights: StudentInsights): number {
  if (insights.conversationCount === 0) return 0;

  let score = 0;

  // Conversation consistency (0-30 points)
  score += Math.min(30, insights.conversationCount * 1.5);

  // Learning path progress (0-30 points)
  score += insights.learningPathProgress * 0.3;

  // FSRS accuracy (0-30 points)
  score += insights.fsrsAccuracy * 0.3;

  // Breadth of subjects (0-10 points)
  score += Math.min(10, insights.topSubjects.length * 3);

  return Math.round(Math.min(100, score));
}

/**
 * Create empty recommendation (for non-Pro users or no data)
 */
export function createEmptyRecommendation(): LearningRecommendation {
  return {
    strengths: [],
    weaknesses: [],
    recommendedTopics: [],
    focusAreas: [],
    overallScore: 0,
    confidenceLevel: "low",
  };
}
