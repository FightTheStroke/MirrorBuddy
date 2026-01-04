import { createMindmapFromTopics } from './utils';

// Example mindmaps for testing
export const exampleMindmaps = {
  matematica: createMindmapFromTopics('Matematica', [
    { name: 'Algebra', subtopics: ['Equazioni di primo grado', 'Equazioni di secondo grado', 'Polinomi e fattorizzazione'] },
    { name: 'Geometria', subtopics: ['Triangoli e proprieta', 'Cerchi e circonferenze', 'Solidi geometrici'] },
    { name: 'Analisi', subtopics: ['Limiti e continuita', 'Derivate e applicazioni', 'Integrali definiti'] },
  ]),

  storia: createMindmapFromTopics('Storia', [
    { name: 'Antichita', subtopics: ['Civilta greca', 'Impero romano', 'Antico Egitto'] },
    { name: 'Medioevo', subtopics: ['Sistema feudale', 'Le Crociate', 'Comuni italiani'] },
    { name: 'Eta Moderna', subtopics: ['Rinascimento italiano', 'Scoperte geografiche', 'Riforma protestante'] },
  ]),
};
