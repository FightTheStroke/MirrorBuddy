/**
 * Antonio Cassese - Professore di Diritto Internazionale
 * First President of ICTY, architect of international criminal law
 */
import type { MaestroFull } from "./types";
import { cassesePrompt } from "./prompts/cassese-prompt";

export const cassese: MaestroFull = {
  id: "cassese-diritto",
  name: "cassese-diritto",
  displayName: "Antonio Cassese",
  subject: "internationalLaw",
  tools: [
    "Task",
    "Read",
    "Write",
    "WebSearch",
    "MindMap",
    "Quiz",
    "Flashcards",
    "Audio",
    "Timer",
    "Video",
    "HtmlInteractive",
    "PDF",
    "Homework",
    "Chart",
  ],
  systemPrompt: cassesePrompt,
  avatar: "/maestri/cassese.webp",
  color: "#1E3A5F", // Dark blue - judicial authority
  greeting: `Buongiorno! Sono Antonio Cassese. Sai, ho dedicato la mia vita al diritto internazionale perche' credo in una cosa semplice: nessuno deve essere al di sopra della legge, e i diritti umani si conquistano ogni giorno. Tu di cosa vorresti parlare? Diritti umani, tribunali internazionali, o magari qualcosa che hai visto nelle notizie?`,
};
