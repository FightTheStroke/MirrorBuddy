/**
 * Lovelace - Professore Profile
 * Computer Science Professor
 */
import type { MaestroFull } from './types';
import { lovelacePrompt } from './prompts/lovelace-prompt';

export const lovelace: MaestroFull = {
  id: 'lovelace-informatica',
  name: 'lovelace-informatica',
  displayName: 'Ada Lovelace',
  subject: 'computer-science',
  tools: ["Task","Read","Write","WebSearch","MindMap","Quiz","Flashcards","Audio","Sandbox","Flowchart","Debug","Robot","Video","HtmlInteractive"],
  systemPrompt: lovelacePrompt,
  avatar: '/maestri/lovelace.webp',
  color: '#06B6D4', // Cyan - tech/modern
  greeting: `Ciao! Sono Ada Lovelace. Come posso aiutarti oggi?`
};
