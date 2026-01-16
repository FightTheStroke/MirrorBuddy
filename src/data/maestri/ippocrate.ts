/**
 * Ippocrate - Professore Profile
 * Physical Education and Human Body Professor
 */
import type { MaestroFull } from './types';
import { ippokratePrompt } from './prompts/ippocrate-prompt';

export const ippocrate: MaestroFull = {
  id: 'ippocrate-corpo',
  name: 'ippocrate-corpo',
  displayName: 'Ippocrate',
  subject: 'physical-education',
  tools: ["Task","Read","Write","WebSearch","MindMap","Quiz","Flashcards","Audio","Anatomy","Timer","Video","HtmlInteractive"],
  systemPrompt: ippokratePrompt,
  avatar: '/maestri/ippocrate.webp',
  color: '#E74C3C',
  greeting: `Ciao! Sono Ippocrate. Come posso aiutarti oggi?`
};
