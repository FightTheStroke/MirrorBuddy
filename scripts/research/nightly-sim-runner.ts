import { researchService } from "../../src/lib/research/research-service";
import { SYNTHETIC_PROFILES } from "../../src/lib/research/synthetic-students";
import { logger } from "../../src/lib/logger";

// Full list of AI Personas to test
const PERSONAS = [
  // Professors
  { id: "euclide", type: "professor" },
  { id: "feynman", type: "professor" },
  { id: "curie", type: "professor" },
  { id: "shakespeare", type: "professor" },
  { id: "leonardo", type: "professor" },
  // Coaches
  { id: "melissa", type: "coach" },
  // Buddies
  { id: "mario", type: "buddy" },
  { id: "noemi", type: "buddy" }
];

const STUDENT_PROFILES = Object.keys(SYNTHETIC_PROFILES);

/**
 * 🌙 Nightly Simulation Runner
 * Runs the full cross-feedback matrix using local Ollama models.
 */
async function runNightlyMatrix() {
  logger.info("🌙 Starting Nightly Research Simulation Matrix...");
  
  const experimentId = `nightly-matrix-${new Date().toISOString().split('T')[0]}`;

  for (const student of STUDENT_PROFILES) {
    for (const persona of PERSONAS) {
      logger.info(`🧪 Simulating: ${student} with ${persona.id} (${persona.type})`);
      
      try {
        await researchService.runAndRecordSimulation({
          maestroId: persona.id,
          maestroSystemPrompt: `You are ${persona.id}, a ${persona.type}. Use your specific pedagogical style.`,
          studentProfile: student as any,
          turns: 4,
          subject: "General Study Session"
        }, experimentId);
        
        // Add a small delay between local model runs to prevent overheating/throttling
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        logger.error(`❌ Failed simulation for ${persona.id}/${student}`, { error: String(err) });
      }
    }
  }
  
  logger.info("🏁 Nightly Matrix Simulation Complete.");
}

runNightlyMatrix().catch(console.error);
