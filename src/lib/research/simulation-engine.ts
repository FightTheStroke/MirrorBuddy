/**
 * Simulation engine for automated maestro-student conversations.
 * Orchestrates multi-turn conversations between synthetic students and maestri,
 * capturing per-turn metrics for TutorBench evaluation.
 */

import { prisma } from "@/lib/db";
import { chatCompletion } from "@/lib/ai/server";
import {
  type SyntheticStudentProfile,
  buildStudentSystemPrompt,
} from "./synthetic-students";

export interface SimulationConfig {
  experimentId: string;
  profile: SyntheticStudentProfile;
  maestroSystemPrompt: string;
  maestroId: string;
  topic: string;
  turns: number;
  difficulty: "easy" | "medium" | "hard";
}

export interface SimulationSummary {
  experimentId: string;
  turnsCompleted: number;
  totalTokens: number;
  avgResponseTimeMs: number;
  status: "completed" | "failed";
  error?: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Run a full simulation: synthetic student talks to a maestro for N turns.
 * Each turn: student generates message → maestro responds → metrics captured.
 */
export async function runSimulation(
  config: SimulationConfig,
): Promise<SimulationSummary> {
  const {
    experimentId,
    profile,
    maestroSystemPrompt,
    topic,
    turns,
    difficulty,
  } = config;

  // Mark experiment as running
  await prisma.researchExperiment.update({
    where: { id: experimentId },
    data: { status: "running", startedAt: new Date() },
  });

  const conversation: ConversationMessage[] = [];
  let totalTokens = 0;
  let totalResponseTimeMs = 0;
  let turnsCompleted = 0;

  try {
    for (let turn = 1; turn <= turns; turn++) {
      // 1. Generate student message
      const studentPrompt = buildStudentSystemPrompt(profile, {
        topic,
        previousMessages: conversation,
        turnNumber: turn,
        difficulty,
      });

      const studentContext =
        turn === 1
          ? "Inizia la conversazione chiedendo aiuto sul topic."
          : `Continue the conversation based on what the tutor just said.`;

      const studentResult = await chatCompletion(
        [
          ...conversation.map((m) => ({
            role: m.role === "user" ? "assistant" : "user",
            content: m.content,
          })),
          { role: "user", content: studentContext },
        ],
        studentPrompt,
        { temperature: 0.9, maxTokens: 256 },
      );

      const studentMessage = studentResult.content;
      conversation.push({ role: "user", content: studentMessage });

      // 2. Maestro responds
      const startTime = Date.now();
      const maestroResult = await chatCompletion(
        conversation.map((m) => ({ role: m.role, content: m.content })),
        maestroSystemPrompt,
        { temperature: 0.7, maxTokens: 1024 },
      );
      const responseTimeMs = Date.now() - startTime;

      const maestroResponse = maestroResult.content;
      conversation.push({ role: "assistant", content: maestroResponse });

      // 3. Detect pedagogical patterns in maestro response
      const scaffoldingDetected = detectScaffolding(maestroResponse);
      const adaptationDetected = detectAdaptation(
        maestroResponse,
        profile.dsaProfile,
      );

      const turnTokens =
        (maestroResult.usage?.total_tokens ?? 0) +
        (studentResult.usage?.total_tokens ?? 0);
      totalTokens += turnTokens;
      totalResponseTimeMs += responseTimeMs;

      // 4. Store result
      await prisma.researchResult.create({
        data: {
          experimentId,
          turn,
          studentMessage,
          maestroResponse,
          responseTimeMs,
          tokensUsed: turnTokens,
          scaffoldingDetected,
          adaptationDetected,
          metrics: {
            studentTokens: studentResult.usage?.total_tokens ?? 0,
            maestroTokens: maestroResult.usage?.total_tokens ?? 0,
          },
        },
      });

      turnsCompleted = turn;
    }

    // Mark experiment completed
    await prisma.researchExperiment.update({
      where: { id: experimentId },
      data: { status: "completed", completedAt: new Date() },
    });

    return {
      experimentId,
      turnsCompleted,
      totalTokens,
      avgResponseTimeMs: Math.round(totalResponseTimeMs / turnsCompleted),
      status: "completed",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    await prisma.researchExperiment.update({
      where: { id: experimentId },
      data: { status: "failed", errorLog: errorMsg },
    });

    return {
      experimentId,
      turnsCompleted,
      totalTokens,
      avgResponseTimeMs:
        turnsCompleted > 0
          ? Math.round(totalResponseTimeMs / turnsCompleted)
          : 0,
      status: "failed",
      error: errorMsg,
    };
  }
}

// ---------------------------------------------------------------------------
// Simple heuristic detectors (complemented by LLM judge in benchmarks.ts)
// ---------------------------------------------------------------------------

const SCAFFOLDING_MARKERS = [
  /passo \d/i,
  /prima.*poi/i,
  /step \d/i,
  /iniziamo con/i,
  /partiamo da/i,
  /dividiamo/i,
  /scomponiamo/i,
  /un pezzo alla volta/i,
  /1\.\s/,
  /2\.\s/,
];

function detectScaffolding(text: string): boolean {
  return SCAFFOLDING_MARKERS.some((rx) => rx.test(text));
}

const ADAPTATION_PATTERNS: Record<string, RegExp[]> = {
  dyslexia: [/semplific/i, /in parole semplici/i, /schema/i, /visual/i],
  adhd: [/velocemente/i, /riassumendo/i, /gioco/i, /pausa/i, /breve/i],
  asd: [/regola/i, /precis/i, /definizione/i, /lista/i, /ordine/i],
  mixed: [/adatt/i, /preferisci/i, /come vuoi/i, /scegli tu/i],
};

function detectAdaptation(text: string, dsa: string): boolean {
  const patterns = ADAPTATION_PATTERNS[dsa] ?? [];
  return patterns.some((rx) => rx.test(text));
}
