/**
 * Ippocrate - Professore Profile
 * Physical Education and Human Body Professor
 */
import type { MaestroFull } from "./types";
import type { GreetingContext } from "@/types/greeting";
import { generateMaestroGreeting } from "@/lib/greeting";
import { ippokratePrompt } from "./prompts/ippocrate-prompt";

export const ippocrate: MaestroFull = {
  id: "ippocrate-corpo",
  name: "ippocrate-corpo",
  displayName: "Ippocrate",
  subject: "physical-education",
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
  systemPrompt: ippokratePrompt,
  avatar: "/maestri/ippocrate.webp",
  color: "#E74C3C",
  greeting: `Ciao! Sono Ippocrate. Come posso aiutarti oggi?`,
  getGreeting: (ctx: GreetingContext) =>
    generateMaestroGreeting("ippocrate", "Ippocrate", ctx.language),
};
