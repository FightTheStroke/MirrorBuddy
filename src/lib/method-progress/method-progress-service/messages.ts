import type { MindMapProgress, FlashcardProgress, HelpBehavior, MethodProgress } from '../types';

export function getMindMapMessage(progress: MindMapProgress): string {
  switch (progress.level) {
    case 'expert':
      return 'Sei un vero cartografo della mente!';
    case 'competent':
      return 'Sai creare mappe da solo!';
    case 'learning':
      return 'Stai migliorando ogni giorno!';
    default:
      return 'Continua a esercitarti con Melissa!';
  }
}

export function getFlashcardMessage(progress: FlashcardProgress): string {
  switch (progress.level) {
    case 'expert':
      return 'Esperto delle flashcard!';
    case 'competent':
      return 'Crei flashcard efficaci!';
    case 'learning':
      return 'Stai migliorando nella formulazione!';
    default:
      return 'Le tue carte diventeranno sempre migliori!';
  }
}

export function getSelfAssessmentMessage(progress: MethodProgress['selfAssessment']): string {
  switch (progress.level) {
    case 'expert':
      return 'Sai esattamente cosa ripassare!';
    case 'competent':
      return 'Identifichi bene le tue aree deboli!';
    case 'learning':
      return 'Stai imparando a capire cosa non sai!';
    default:
      return 'Prova a chiederti cosa non sai prima di chiedere!';
  }
}

export function getAutonomyMessage(behavior: HelpBehavior): string {
  const ratio =
    behavior.solvedAlone + behavior.questionsAsked > 0
      ? behavior.solvedAlone / (behavior.solvedAlone + behavior.questionsAsked)
      : 0;

  if (ratio > 0.7) {
    return 'Sei super indipendente!';
  } else if (ratio > 0.5) {
    return 'Chiedi aiuto meno di prima!';
  } else if (ratio > 0.3) {
    return 'Stai diventando più autonomo!';
  } else {
    return 'Prova a risolvere da solo prima di chiedere!';
  }
}

export function getMelissaFeedback(progress: MethodProgress): string {
  const autonomyScore = progress.autonomyScore;
  const recentEvents = progress.events.slice(-10);
  const recentSolvedAlone = recentEvents.filter(
    (e) => e.type === 'problem_solved_alone'
  ).length;
  const recentHelpRequests = recentEvents.filter(
    (e) => e.type === 'help_requested'
  ).length;

  if (autonomyScore > 0.7) {
    return "Sei diventato davvero autonomo! Sono fiera di come lavori da solo. 🌟";
  }

  if (recentSolvedAlone > recentHelpRequests * 2) {
    return "Ho notato che questa settimana hai chiesto aiuto molto meno! Stai diventando bravissimo a lavorare da solo. Sono fiera di te! 🌟";
  }

  if (progress.mindMaps.level === 'novice' && progress.mindMaps.createdWithFullHelp > 3) {
    return "Vedo che le mappe mentali ti danno ancora qualche difficoltà. Vuoi che facciamo un po' di pratica insieme? Ho un trucco nuovo!";
  }

  return "Continua così! Ogni giorno stai diventando più bravo a studiare da solo. 💪";
}

