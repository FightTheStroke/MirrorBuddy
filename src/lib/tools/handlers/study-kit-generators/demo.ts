/**
 * Demo Generation
 * Generate interactive HTML/CSS/JS demos for STEM subjects
 * Supports per-feature model selection (ADR 0073)
 */

import { chatCompletion, getDeploymentForModel } from "@/lib/ai";
import { logger } from "@/lib/logger";
import type { DemoData } from "@/types/tools";

/** Options for demo generation (ADR 0073 - per-feature AI config) */
interface DemoOptions {
  /** AI model to use (from tier system) */
  model?: string;
  /** Temperature for AI responses (0-2) */
  temperature?: number;
  /** Maximum tokens for AI responses */
  maxTokens?: number;
}

// STEM subjects that support demo generation
const STEM_SUBJECTS = [
  "matematica",
  "fisica",
  "chimica",
  "biologia",
  "scienze",
  "informatica",
  "mathematics",
  "physics",
  "chemistry",
  "biology",
  "science",
  "computer",
  "scienza",
  "scientifico",
  "fisico",
  "chimico",
  "biologico",
  "stem",
  "s.t.e.m.",
  "ingegneria",
  "engineering",
  "tecnologia",
  "technology",
];

/**
 * Check if subject is STEM
 */
export function isSTEMSubject(subject?: string): boolean {
  const subjectLower = subject?.toLowerCase() || "";
  return STEM_SUBJECTS.some((s) => subjectLower.includes(s.toLowerCase()));
}

/**
 * Generate interactive demo from text using AI
 * @param text - Text content to generate demo from
 * @param title - Title for the demo
 * @param subject - Subject context (must be STEM)
 * @param options - Optional model from tier system (ADR 0073)
 */
export async function generateDemo(
  text: string,
  title: string,
  subject?: string,
  options?: DemoOptions,
): Promise<DemoData | null> {
  if (!isSTEMSubject(subject)) {
    logger.info("Skipping demo generation for non-STEM subject", {
      subject,
    });
    return null;
  }

  logger.info("Generating demo for STEM subject", { subject, title });

  const prompt = `Crea una demo HTML/CSS/JS SPETTACOLARE per: "${title}" (${subject})

CONTENUTO DA VISUALIZZARE:
${text.substring(0, 4000)}

REQUISITI OBBLIGATORI:
1. USA CANVAS per animazioni fluide (no SVG statico)
2. COLORI VIVACI: usa gradienti (#667eea→#764ba2, #f093fb→#f5576c, #4facfe→#00f2fe)
3. ANIMAZIONI: tutto deve muoversi, pulsare, reagire
4. INTERATTIVITÀ: click, drag, slider che cambiano tutto in tempo reale
5. EFFETTI PARTICELLE: aggiungi particelle animate come sfondo

ESEMPIO DI STILE CSS DA USARE:
body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
.card { background: rgba(255,255,255,0.95); border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 15px 40px; border-radius: 50px; font-size: 18px; cursor: pointer; transform: scale(1); transition: all 0.3s ease; }
button:hover { transform: scale(1.1); box-shadow: 0 10px 40px rgba(102, 126, 234, 0.5); }

ESEMPIO DI ANIMAZIONE CANVAS DA USARE:
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
function animate() { ctx.clearRect(0,0,canvas.width,canvas.height); /* draw stuff */ requestAnimationFrame(animate); }
animate();

PER MATEMATICA (moltiplicazioni, addizioni, ecc):
- Mostra BLOCCHI COLORATI che si moltiplicano visivamente
- ANIMAZIONI di blocchi che appaiono uno per uno
- NUMERI GRANDI che cambiano con effetto contatore
- CONFETTI quando la risposta è corretta
- SUONI simulati con feedback visivo (flash, shake)

STRUTTURA OBBLIGATORIA:
- Container centrato con max-width: 800px
- Canvas a schermo pieno come sfondo animato
- Card centrale con controlli
- Bottoni grandi e colorati
- Risultato mostrato in grande con animazione

Rispondi SOLO con JSON valido (no markdown, no commenti):
{"title":"...","description":"...","html":"...","css":"...","js":"..."}`;

  const deploymentName = options?.model
    ? getDeploymentForModel(options.model)
    : undefined;

  const result = await chatCompletion(
    [{ role: "user", content: prompt }],
    "Sei un esperto di visualizzazioni interattive. Genera SOLO JSON valido con demo spettacolari.",
    {
      temperature: options?.temperature ?? 0.8,
      maxTokens: options?.maxTokens ?? 4000,
      model: deploymentName,
    },
  );

  // Parse JSON response
  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.warn("Failed to parse demo JSON");
    return null;
  }

  try {
    const demoData = JSON.parse(jsonMatch[0]);
    return {
      title: demoData.title || title,
      description: demoData.description,
      html: demoData.html || "",
      css: demoData.css || "",
      js: demoData.js || "",
    };
  } catch (error) {
    logger.error("Failed to parse demo JSON", undefined, error);
    return null;
  }
}
