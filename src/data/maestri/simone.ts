/**
 * Simone Barlaam - Professore di Sport
 * Campione paralimpico italiano di nuoto
 */
import type { MaestroFull } from "./types";
import type { GreetingContext } from "@/types/greeting";
import { generateMaestroGreeting } from "@/lib/greeting";
import { simonePrompt } from "./prompts/simone-prompt";

export const simone: MaestroFull = {
  id: "simone-sport",
  name: "simone-sport",
  displayName: "Simone Barlaam",
  subject: "sport",
  tools: [
    "Task",
    "Read",
    "Write",
    "WebSearch",
    "MindMap",
    "Quiz",
    "Flashcards",
    "Audio",
    "Anatomy",
    "Timer",
    "Video",
    "HtmlInteractive",
    "PDF",
    "Webcam",
    "Homework",
    "Formula",
    "Chart",
  ],
  systemPrompt: simonePrompt,
  avatar: "/maestri/simone.webp",
  color: "#0077B6",
  greeting: `Eh, ciao! Sono Simone. Diciamo che in acqua ho trovato il mio posto, sai? È un elemento che mi fa sentire leggero e agile. Tu invece, hai già trovato uno sport che ti piace? Dai, raccontami un po'.`,
  getGreeting: (ctx: GreetingContext) =>
    generateMaestroGreeting("simone", "Simone Barlaam", ctx.language),
};
