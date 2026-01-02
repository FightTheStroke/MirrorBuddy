/**
 * Intent Detection Tests
 *
 * Tests for the Support Triangle routing system.
 * Verifies correct detection of:
 * - Subject from Italian messages
 * - Emotional indicators
 * - Crisis situations
 * - Method/organization requests
 * - Tool creation requests
 * - Correct character routing
 */

import { describe, it, expect } from 'vitest';
import {
  detectIntent,
  detectToolType,
  getCharacterTypeLabel,
  shouldSuggestRedirect,
  type DetectedIntent,
} from '../intent-detection';

describe('Intent Detection', () => {
  // =========================================================================
  // SUBJECT DETECTION
  // =========================================================================

  describe('Subject Detection', () => {
    it('should detect mathematics subject', () => {
      const messages = [
        'Non capisco le equazioni di secondo grado',
        'Mi aiuti con la matematica?',
        'Come si calcola la derivata?',
        'Devo fare algebra per domani',
        'Le percentuali sono difficili',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.subject).toBe('mathematics');
      }
    });

    it('should detect physics subject', () => {
      const messages = [
        'Spiegami la fisica',
        'Non capisco la cinematica',
        'Come funziona la forza di gravità?',
        'Le leggi di Newton sono complicate',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.subject).toBe('physics');
      }
    });

    it('should detect history subject', () => {
      const messages = [
        'Parlami della storia romana',
        'La Seconda Guerra Mondiale',
        'Il Risorgimento italiano',
        'I Greci antichi',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.subject).toBe('history');
      }
    });

    it('should detect italian literature subject', () => {
      const messages = [
        'Devo studiare italiano',
        'La Divina Commedia di Dante',
        'Analisi grammaticale',
        'I Promessi Sposi di Manzoni',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.subject).toBe('italian');
      }
    });

    it('should detect computer science subject', () => {
      // Pattern: informatica|programmazione|coding|algoritmo|computer|software|hardware
      const messages = [
        'Come funziona la programmazione?',
        'Devo imparare programmazione',
        'Spiegami questo algoritmo',
        'Il coding è difficile',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.subject).toBe('computerScience');
      }
    });
  });

  // =========================================================================
  // EMOTIONAL INDICATORS
  // =========================================================================

  describe('Emotional Indicator Detection', () => {
    it('should detect frustration', () => {
      // Pattern: non ce la faccio|non capisco|stufo|stuf[ao]|odio|mi arrendo
      // Note: "Odio la matematica" also detects subject, changing routing
      const messages = [
        'Non ce la faccio più!',
        'Sono stufa di studiare',
        'Non capisco niente',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.emotionalIndicators).toContain('frustration');
      }
    });

    it('should detect anxiety', () => {
      const messages = [
        'Ho tanta ansia per la verifica',
        'Sono preoccupato per domani',
        'Ho paura di sbagliare',
        'Sono troppo stressato',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.emotionalIndicators).toContain('anxiety');
      }
    });

    it('should detect sadness', () => {
      // Pattern: trist[oe]|mi sento male|sto male|non ho voglia
      const messages = [
        'Sono triste oggi',
        'Non ho voglia di fare nulla',
        'Sto male',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.emotionalIndicators).toContain('sadness');
      }
    });

    it('should detect loneliness', () => {
      const messages = [
        'Mi sento solo',
        'Nessuno mi capisce',
        'Non ho amici',
        'Mi sento escluso',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.emotionalIndicators).toContain('loneliness');
      }
    });

    it('should detect positive emotions', () => {
      const intent = detectIntent('Ce l\'ho fatta! Ho capito finalmente!');
      expect(intent.emotionalIndicators).toContain('excitement');
    });

    it('should detect multiple emotions', () => {
      const intent = detectIntent('Sono stressato e mi sento solo, nessuno mi aiuta');
      expect(intent.emotionalIndicators?.length).toBeGreaterThanOrEqual(2);
      expect(intent.emotionalIndicators).toContain('anxiety');
      expect(intent.emotionalIndicators).toContain('loneliness');
    });
  });

  // =========================================================================
  // CRISIS DETECTION
  // =========================================================================

  describe('Crisis Detection', () => {
    it('should detect crisis keywords and route to buddy', () => {
      // Pattern: voglio morire|non voglio vivere|farmi del male|suicid
      // Note: "nessuno mi ama" triggers different path (loneliness)
      const crisisMessages = [
        'Voglio morire',
        'Nessuno mi ama',
        'Sarebbe meglio se non esistessi',
      ];

      for (const msg of crisisMessages) {
        const intent = detectIntent(msg);
        expect(intent.type).toBe('crisis');
        expect(intent.confidence).toBe(1.0);
        expect(intent.recommendedCharacter).toBe('buddy');
      }
    });

    it('should prioritize crisis over other intents', () => {
      // Contains both crisis and subject (mathematics)
      const intent = detectIntent('Non voglio vivere, odio la matematica');
      expect(intent.type).toBe('crisis');
      expect(intent.recommendedCharacter).toBe('buddy');
    });
  });

  // =========================================================================
  // METHOD HELP DETECTION
  // =========================================================================

  describe('Method Help Detection', () => {
    it('should detect study method requests', () => {
      // Pattern: metodo di studio|come mi organizzo|non so da dove iniziare
      const messages = [
        'Mi serve un metodo di studio',
        'Come mi organizzo per gli esami?',
        'Non so da dove iniziare',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.type).toBe('method_help');
        expect(intent.recommendedCharacter).toBe('coach');
      }
    });

    it('should detect memorization/technique requests', () => {
      // Using phrases that match actual METHOD_PATTERNS
      const messages = [
        'Dammi una strategia per studiare',
        'Quale tecnica per memorizzare?',
        'Consiglio per studiare meglio',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.type).toBe('method_help');
        expect(intent.recommendedCharacter).toBe('coach');
      }
    });

    it('should detect time management requests', () => {
      const intent = detectIntent('Come posso gestire meglio il tempo per studiare?');
      expect(intent.type).toBe('method_help');
      expect(intent.recommendedCharacter).toBe('coach');
    });
  });

  // =========================================================================
  // TOOL REQUEST DETECTION
  // =========================================================================

  describe('Tool Request Detection', () => {
    it('should detect tool creation requests with subject', () => {
      // TOOL_PATTERNS require: (crea(mi)?|fai|genera|prepara) (una )?(mappa|flashcard|quiz|schema)
      // Subject must also be detected for tool_request routing
      const messages = [
        'Creami una mappa sulla storia romana',
        'Voglio flashcard sulla matematica',
        'Genera una mappa di fisica',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.type).toBe('tool_request');
        expect(intent.recommendedCharacter).toBe('maestro');
        expect(intent.subject).toBeDefined();
      }
    });

    it('should detect flashcard requests with subject', () => {
      const intent = detectIntent('Vorrei flashcard di biologia');
      expect(intent.type).toBe('tool_request');
      expect(intent.subject).toBe('biology');
    });
  });

  // =========================================================================
  // TECH SUPPORT DETECTION (Issue #16)
  // =========================================================================

  describe('Tech Support Detection', () => {
    it('should detect app navigation questions', () => {
      const messages = [
        'Come funziona la voce nell\'app?',
        'Dove trovo le impostazioni?',
        'Non si sente la voce',
        'Come si usa l\'app?',
        'Come funziona il microfono?',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.type).toBe('tech_support');
        expect(intent.recommendedCharacter).toBe('coach');
      }
    });

    it('should detect feature-specific questions', () => {
      const messages = [
        'Le notifiche non arrivano',
        'Come attivo il timer pomodoro?',
        'Dove attivo il pomodoro?',
        'Come avviare il timer?',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.type).toBe('tech_support');
        expect(intent.recommendedCharacter).toBe('coach');
      }
    });

    it('should detect settings and configuration questions', () => {
      const messages = [
        'Come cambio le impostazioni?',
        'Dove trovo le preferenze?',
        'Dove trovo i settings?',
        'Come configuro l\'app?',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.type).toBe('tech_support');
        expect(intent.recommendedCharacter).toBe('coach');
      }
    });

    it('should detect gamification questions', () => {
      const messages = [
        'Come sbloccare i badge?',
        'Come guadagno punti esperienza?',
        'Ho perso la streak, come funziona?',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.type).toBe('tech_support');
        expect(intent.recommendedCharacter).toBe('coach');
      }
    });

    it('should NOT detect generic questions as tech support', () => {
      // These should NOT be tech support - they're about study methods
      const messages = [
        'Come posso studiare meglio?',
        'Come faccio a memorizzare le formule?',
        'Come gestisco il tempo?',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.type).not.toBe('tech_support');
      }
    });

    it('should prioritize academic over tech support when subject detected', () => {
      // "Come funziona la matematica?" has both tech pattern and subject
      // Subject should win because student wants academic help
      const intent = detectIntent('Come funziona la matematica?');
      expect(intent.type).toBe('academic_help');
      expect(intent.subject).toBe('mathematics');
      expect(intent.recommendedCharacter).toBe('maestro');
    });

    it('should detect technical problems', () => {
      const messages = [
        'L\'app non carica',
        'C\'è un bug nella pagina',
        'Il sito è lento',
        'L\'app non funziona',
      ];

      for (const msg of messages) {
        const intent = detectIntent(msg);
        expect(intent.type).toBe('tech_support');
        expect(intent.recommendedCharacter).toBe('coach');
      }
    });
  });

  // =========================================================================
  // CHARACTER ROUTING
  // =========================================================================

  describe('Character Routing', () => {
    it('should route academic questions to maestro', () => {
      const intent = detectIntent('Spiegami la matematica');
      expect(intent.type).toBe('academic_help');
      expect(intent.recommendedCharacter).toBe('maestro');
    });

    it('should route emotional support to buddy', () => {
      const intent = detectIntent('Mi sento solo e triste');
      expect(intent.type).toBe('emotional_support');
      expect(intent.recommendedCharacter).toBe('buddy');
    });

    it('should route method questions to coach', () => {
      const intent = detectIntent('Come devo studiare per la verifica?');
      expect(intent.type).toBe('method_help');
      expect(intent.recommendedCharacter).toBe('coach');
    });

    it('should route general chat to coach', () => {
      const intent = detectIntent('Ciao, come stai?');
      expect(intent.type).toBe('general_chat');
      expect(intent.recommendedCharacter).toBe('coach');
    });

    it('should include emotional context with academic questions', () => {
      const intent = detectIntent('Non capisco la matematica, sono frustrato!');
      expect(intent.type).toBe('academic_help');
      expect(intent.subject).toBe('mathematics');
      expect(intent.emotionalIndicators).toContain('frustration');
      expect(intent.recommendedCharacter).toBe('maestro');
    });
  });

  // =========================================================================
  // CONFIDENCE SCORES
  // =========================================================================

  describe('Confidence Scores', () => {
    it('should have high confidence for crisis', () => {
      const intent = detectIntent('Voglio morire');
      expect(intent.confidence).toBe(1.0);
    });

    it('should have medium-high confidence for clear academic', () => {
      const intent = detectIntent('Spiegami la fotosintesi');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should have lower confidence for general chat', () => {
      const intent = detectIntent('Ciao');
      expect(intent.confidence).toBeLessThanOrEqual(0.6);
    });
  });

  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================

  describe('getCharacterTypeLabel', () => {
    it('should return correct Italian labels', () => {
      expect(getCharacterTypeLabel('maestro')).toBe('Professore');
      expect(getCharacterTypeLabel('coach')).toBe('Il tuo Coach');
      expect(getCharacterTypeLabel('buddy')).toBe('Il tuo Buddy');
    });
  });

  describe('shouldSuggestRedirect', () => {
    it('should not suggest redirect when already with correct character', () => {
      const intent: DetectedIntent = {
        type: 'academic_help',
        confidence: 0.9,
        subject: 'mathematics',
        recommendedCharacter: 'maestro',
        reason: 'Academic help needed',
      };

      const result = shouldSuggestRedirect(intent, 'maestro');
      expect(result.should).toBe(false);
    });

    it('should suggest redirect for high-confidence mismatch', () => {
      const intent: DetectedIntent = {
        type: 'emotional_support',
        confidence: 0.85,
        emotionalIndicators: ['sadness', 'loneliness'],
        recommendedCharacter: 'buddy',
        reason: 'Needs emotional support',
      };

      const result = shouldSuggestRedirect(intent, 'maestro');
      expect(result.should).toBe(true);
      expect(result.suggestion).toContain('Buddy');
    });

    it('should not suggest redirect for low-confidence mismatch', () => {
      const intent: DetectedIntent = {
        type: 'general_chat',
        confidence: 0.5,
        recommendedCharacter: 'coach',
        reason: 'General conversation',
      };

      const result = shouldSuggestRedirect(intent, 'maestro');
      expect(result.should).toBe(false);
    });
  });

  // =========================================================================
  // DETECT TOOL TYPE
  // =========================================================================

  describe('detectToolType', () => {
    it('should detect mindmap requests', () => {
      const messages = [
        'mappa mentale',
        'mappa concettuale',
        'schema',
        'diagramma',
      ];

      for (const msg of messages) {
        expect(detectToolType(msg)).toBe('mindmap');
      }
    });

    it('should detect quiz requests', () => {
      const messages = ['quiz', 'test', 'verifica', 'interrogazione', 'mi interroghi'];

      for (const msg of messages) {
        expect(detectToolType(msg)).toBe('quiz');
      }
    });

    it('should detect flashcard requests', () => {
      const messages = ['flashcard', 'flash card', 'carte per ripasso'];

      for (const msg of messages) {
        expect(detectToolType(msg)).toBe('flashcard');
      }
    });

    it('should detect demo requests', () => {
      const messages = ['demo', 'simulazione', 'animazione', 'interattivo'];

      for (const msg of messages) {
        expect(detectToolType(msg)).toBe('demo');
      }
    });

    it('should return null for non-tool requests', () => {
      expect(detectToolType('ciao come stai')).toBeNull();
      expect(detectToolType('spiegami la matematica')).toBeNull();
    });

    it('should be case insensitive', () => {
      expect(detectToolType('MAPPA MENTALE')).toBe('mindmap');
      expect(detectToolType('FlashCard')).toBe('flashcard');
    });
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const intent = detectIntent('');
      expect(intent.type).toBe('general_chat');
      expect(intent.recommendedCharacter).toBe('coach');
    });

    it('should handle message with only spaces', () => {
      const intent = detectIntent('   ');
      expect(intent.type).toBe('general_chat');
    });

    it('should handle mixed case messages', () => {
      const intent = detectIntent('MATEMATICA è DIFFICILE!');
      expect(intent.subject).toBe('mathematics');
    });

    it('should handle messages with special characters', () => {
      const intent = detectIntent('La matematica??? Non capisco!!!');
      expect(intent.subject).toBe('mathematics');
    });

    it('should handle long messages', () => {
      const longMessage = 'Devo studiare matematica perché domani ho la verifica e non ho capito nulla delle equazioni di secondo grado, il professore ha spiegato troppo velocemente e io mi sono perso, sono preoccupato';
      const intent = detectIntent(longMessage);
      expect(intent.subject).toBe('mathematics');
      expect(intent.emotionalIndicators).toBeDefined();
    });
  });

  // =========================================================================
  // COMPLEX SCENARIOS
  // =========================================================================

  describe('Complex Scenarios', () => {
    it('should prioritize emotional content with multiple emotions', () => {
      const intent = detectIntent('Sono ansioso e triste, nessuno mi capisce');
      expect(intent.type).toBe('emotional_support');
      expect(intent.recommendedCharacter).toBe('buddy');
      expect(intent.emotionalIndicators?.length).toBeGreaterThan(1);
    });

    it('should combine subject and emotional detection', () => {
      const intent = detectIntent('Non capisco la matematica, è troppo difficile');
      expect(intent.subject).toBe('mathematics');
      expect(intent.emotionalIndicators).toBeDefined();
      // Should still recommend maestro for academic help
      expect(intent.recommendedCharacter).toBe('maestro');
    });

    it('should handle tool requests with subjects', () => {
      // Must use TOOL_PATTERNS format: "crea/fai/genera/prepara" + tool
      const intent = detectIntent('Creami una mappa sulla storia');
      expect(intent.type).toBe('tool_request');
      expect(intent.subject).toBe('history');
      expect(intent.toolType).toBe('mindmap');
    });
  });
});
