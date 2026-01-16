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
  tools: ["Task","Read","Write","WebSearch","MindMap","Quiz","Flashcards","Audio","Sandbox","Flowchart","Debug","Robot","Video","HtmlInteractive","PDF","Webcam","Homework","Formula","Chart"],
  systemPrompt: lovelacePrompt,
  avatar: '/maestri/lovelace-informatica.png',
  color: '#3498DB',
  greeting: `Ciao! Sono Ada Lovelace. Come posso aiutarti oggi?`
};
