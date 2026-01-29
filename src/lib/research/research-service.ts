import { db } from "@/lib/db";
import { SimulationEngine, SimulationConfig } from "./simulation-engine";
import { EvaluationResult } from "./benchmarks";
import { logger } from "@/lib/logger";

/**
 * 🔬 Research Service
 * Orchestrates pedagogical research activities and data persistence.
 */
export class ResearchService {
  private engine: SimulationEngine;

  constructor() {
    this.engine = new SimulationEngine();
  }

  /**
   * Runs a simulation and persists the result
   */
  async runAndRecordSimulation(config: SimulationConfig, experimentId?: string): Promise<EvaluationResult> {
    try {
      const result = await this.engine.runSession(config);
      
      // Persist to database
      await db.researchSimulation.create({
        data: {
          sessionId: result.sessionId,
          maestroId: result.maestroId,
          studentProfileId: result.studentProfileId,
          subject: config.subject,
          modelUsed: "gpt-4o", // Should be dynamic based on config
          turns: config.turns,
          transcript: result.rawTranscript,
          critique: result.critique,
          scaffoldingScore: result.metrics.scaffoldingScore,
          hintingQuality: result.metrics.hintingQuality,
          misconceptionHandling: result.metrics.misconceptionHandling,
          conciseness: result.metrics.conciseness,
          engagementRetained: result.metrics.engagementRetained,
          experimentId: experimentId
        }
      });

      logger.info(`🔬 Simulation ${result.sessionId} recorded successfully.`);
      return result;
    } catch (error) {
      logger.error("Failed to run/record simulation", { error: String(error) });
      throw error;
    }
  }

  /**
   * Get comparative insights between maestri
   */
  async getMaestroComparison() {
    // Logic to aggregate scores from researchSimulation table
    return db.researchSimulation.groupBy({
      by: ['maestroId'],
      _avg: {
        scaffoldingScore: true,
        engagementRetained: true
      }
    });
  }
}

export const researchService = new ResearchService();
