/**
 * @file example-mindmaps.ts
 * @brief Example mindmaps for each subject
 */

import { createMindmapFromTopics } from '@/components/tools/markmap';
import type { MindmapNode } from '../types';

export interface ExampleMindmap {
  title: string;
  nodes: MindmapNode[];
}

export const exampleMindmapsBySubject: Record<string, ExampleMindmap> = {
  mathematics: createMindmapFromTopics('Algebra', [
    { name: 'Equazioni', subtopics: ['1° grado', '2° grado', 'Sistemi'] },
    { name: 'Funzioni', subtopics: ['Lineari', 'Quadratiche', 'Esponenziali'] },
    {
      name: 'Geometria Analitica',
      subtopics: ['Rette', 'Parabole', 'Circonferenze'],
    },
  ]),
  history: createMindmapFromTopics('Seconda Guerra Mondiale', [
    {
      name: 'Cause',
      subtopics: ['Trattato di Versailles', 'Nazismo', 'Espansionismo'],
    },
    { name: 'Eventi', subtopics: ['Blitzkrieg', 'Pearl Harbor', 'D-Day'] },
    {
      name: 'Conseguenze',
      subtopics: ['ONU', 'Guerra Fredda', 'Decolonizzazione'],
    },
  ]),
  italian: createMindmapFromTopics('Divina Commedia', [
    {
      name: 'Inferno',
      subtopics: ['Struttura', 'Personaggi', 'Contrappasso'],
    },
    { name: 'Purgatorio', subtopics: ['7 Cornici', 'Beatrice', 'Preghiere'] },
    { name: 'Paradiso', subtopics: ['9 Cieli', 'Beatitudine', 'Visione di Dio'] },
  ]),
  physics: createMindmapFromTopics('Meccanica', [
    { name: 'Cinematica', subtopics: ['MRU', 'MRUA', 'Moto Circolare'] },
    { name: 'Dinamica', subtopics: ['Leggi di Newton', 'Forza', 'Lavoro'] },
    { name: 'Energia', subtopics: ['Cinetica', 'Potenziale', 'Conservazione'] },
  ]),
  biology: createMindmapFromTopics('Cellula', [
    { name: 'Struttura', subtopics: ['Membrana', 'Citoplasma', 'Nucleo'] },
    { name: 'Organelli', subtopics: ['Mitocondri', 'Ribosomi', 'RE'] },
    {
      name: 'Processi',
      subtopics: ['Mitosi', 'Meiosi', 'Sintesi Proteica'],
    },
  ]),
  english: createMindmapFromTopics('English Tenses', [
    { name: 'Present', subtopics: ['Simple', 'Continuous', 'Perfect'] },
    { name: 'Past', subtopics: ['Simple', 'Continuous', 'Perfect'] },
    { name: 'Future', subtopics: ['Will', 'Going to', 'Present Continuous'] },
  ]),
};

