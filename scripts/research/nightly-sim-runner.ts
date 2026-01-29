import { researchService } from "../../src/lib/research/research-service";
import { SYNTHETIC_PROFILES } from "../../src/lib/research/synthetic-students";
import { logger } from "../../src/lib/logger";

// Optimized Models for MacBook M3 Max
const MODELS = {
  MAESTRO: "llama3.1:8b",
  STUDENT: "llama3.2:3b",
  JUDGE: "mistral-nemo:12b"
};

const PERSONAS = [
  { id: "euclide", type: "professor" },
  { id: "feynman", type: "professor" },
  { id: "curie", type: "professor" },
  { id: "shakespeare", type: "professor" },
  { id: "leonardo", type: "professor" },
  { id: "melissa", type: "coach" },
  { id: "mario", type: "buddy" },
  { id: "noemi", type: "buddy" }
];

const STUDENT_PROFILES = Object.keys(SYNTHETIC_PROFILES);

async function runNightlyMatrix() {
  logger.info(`🌙 Starting Nightly Matrix on M3 Max. Maestro: ${MODELS.MAESTRO}, Student: ${MODELS.STUDENT}`);
  
  const experimentId = `m3max-matrix-${new Date().toISOString().split('T')[0]}`;

  for (const student of STUDENT_PROFILES) {
    for (const persona of PERSONAS) {
      logger.info(`🧪 [M3 Max] Simulating: ${student} + ${persona.id}`);
      
      try {
        await researchService.runAndRecordSimulation({
          maestroId: persona.id,
          maestroSystemPrompt: `You are ${persona.id}, a ${persona.type}. Use your specific pedagogical style.`,
          studentProfile: student as any,
          turns: 4,
          subject: "General Study Session"
          // In researchService, we should add model overrides here
        }, experimentId);
        
      } catch (err) {
        logger.error(`❌ Failed: ${persona.id}/${student}`, { error: String(err) });
      }
    }
  }
  
  logger.info("🏁 M3 Max Matrix Complete.");
}

runNightlyMatrix().catch(console.error);
