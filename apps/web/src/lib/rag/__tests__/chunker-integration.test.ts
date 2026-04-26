/**
 * Integration Tests for Semantic Chunker with Educational Content
 * Tests chunking on realistic educational text (Roman History)
 * @module rag/chunker-integration
 */

import { describe, it, expect } from 'vitest';
import { chunkText, estimateTokens } from '../semantic-chunker';

// Sample educational content about Roman History
const STORIA_ROMANA_SAMPLE = `
La Repubblica Romana: Origini e Sviluppo

La Repubblica Romana fu il sistema di governo dell'antica Roma dalla fine della monarchia nel 509 a.C. fino all'instaurazione dell'Impero nel 27 a.C. Questo periodo di quasi cinque secoli vide Roma trasformarsi da una piccola città-stato a una potenza mediterranea.

Le Istituzioni Repubblicane

Il sistema politico romano si basava su tre elementi fondamentali: i magistrati, il Senato e le assemblee popolari. I magistrati erano eletti annualmente e avevano poteri specifici. I consoli, in numero di due, detenevano il potere esecutivo supremo. I pretori amministravano la giustizia. I questori gestivano le finanze pubbliche.

Il Senato era il cuore del sistema repubblicano. Composto inizialmente da 300 membri, poi aumentati a 600 e infine a 900, era formato da ex magistrati. Il Senato controllava la politica estera, le finanze statali e le questioni religiose. Sebbene formalmente consultivo, il suo parere era praticamente vincolante.

Le Guerre Puniche

Le Guerre Puniche furono tre conflitti che opposero Roma a Cartagine tra il 264 e il 146 a.C. La prima guerra (264-241 a.C.) fu combattuta principalmente in Sicilia e sul mare. Roma, tradizionalmente una potenza terrestre, costruì una flotta e sconfisse Cartagine grazie all'innovazione del corvo, un ponte d'abbordaggio.

La seconda guerra punica (218-201 a.C.) vide l'invasione dell'Italia da parte di Annibale Barca. Attraversando le Alpi con i suoi elefanti, Annibale inflisse pesanti sconfitte ai Romani a Trebbia, al lago Trasimeno e soprattutto a Canne nel 216 a.C. Tuttavia, Roma resistette grazie alla strategia di Fabio Massimo e alla fedeltà degli alleati italici. La guerra si concluse con la vittoria di Scipione l'Africano a Zama nel 202 a.C.

La terza guerra punica (149-146 a.C.) terminò con la completa distruzione di Cartagine. La città fu rasa al suolo e il suo territorio divenne la provincia romana d'Africa.

La Crisi della Repubblica

Nel II e I secolo a.C., la Repubblica romana attraversò una profonda crisi. L'espansione territoriale aveva creato enormi ricchezze ma anche profondi squilibri sociali. I piccoli contadini, costretti a lunghi periodi di servizio militare, perdevano le loro terre a favore dei latifondisti.

I tentativi di riforma dei fratelli Gracchi (Tiberio nel 133 a.C. e Gaio nel 123 a.C.) fallirono tragicamente. Entrambi furono uccisi dai loro oppositori politici. La violenza divenne uno strumento sempre più comune nella politica romana.

Le guerre civili

Il I secolo a.C. fu caratterizzato da una serie di guerre civili. La rivalità tra Mario e Silla portò alla prima guerra civile (88-82 a.C.). Silla instaurò una dittatura e compì proscrizioni contro i suoi nemici politici.

Dopo Silla, emersero nuovi protagonisti: Pompeo, Crasso e Cesare formarono il primo triumvirato nel 60 a.C. La rottura dell'alleanza portò alla guerra civile tra Cesare e Pompeo (49-45 a.C.). Cesare prevalse ma fu assassinato alle Idi di Marzo del 44 a.C.

La Fine della Repubblica

Dopo la morte di Cesare, Ottaviano, Marco Antonio e Lepido formarono il secondo triumvirato. Eliminati i cesaricidi a Filippi (42 a.C.), i triumviri si divisero il mondo romano. La rivalità tra Ottaviano e Marco Antonio sfociò nella guerra finale, conclusasi con la battaglia di Azio nel 31 a.C.

Ottaviano rimase l'unico padrone di Roma. Nel 27 a.C. ricevette dal Senato il titolo di Augusto, segnando l'inizio dell'era imperiale. La Repubblica, dopo quasi cinque secoli, era definitivamente tramontata.
`;

describe('Chunker Integration Tests - Educational Content', () => {
  describe('Roman History Content', () => {
    it('should chunk educational text into manageable pieces', () => {
      const chunks = chunkText(STORIA_ROMANA_SAMPLE, {
        maxChunkSize: 800,
        overlap: 100,
        respectParagraphs: true,
      });

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.length).toBeLessThan(20);

      // Each chunk should be reasonable size
      chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeLessThanOrEqual(1000);
        expect(chunk.content.length).toBeGreaterThan(50);
      });
    });

    it('should preserve paragraph structure', () => {
      const chunks = chunkText(STORIA_ROMANA_SAMPLE, {
        maxChunkSize: 1000,
        respectParagraphs: true,
      });

      // Check that headers are preserved
      const hasHeader = chunks.some(
        (c) => c.content.includes('Repubblica Romana') || c.content.includes('Istituzioni')
      );
      expect(hasHeader).toBe(true);
    });

    it('should estimate tokens correctly for Italian text', () => {
      const tokens = estimateTokens(STORIA_ROMANA_SAMPLE);

      // Italian text should estimate ~4 chars per token
      const expectedMin = STORIA_ROMANA_SAMPLE.length / 5;
      const expectedMax = STORIA_ROMANA_SAMPLE.length / 3;

      expect(tokens).toBeGreaterThan(expectedMin);
      expect(tokens).toBeLessThan(expectedMax);
    });

    it('should create chunks suitable for embedding', () => {
      const chunks = chunkText(STORIA_ROMANA_SAMPLE, {
        maxChunkSize: 500,
        overlap: 50,
      });

      // Each chunk should have enough context for meaningful embedding
      chunks.forEach((chunk) => {
        const tokenCount = estimateTokens(chunk.content);
        // Typical embedding models work best with 50-500 tokens
        expect(tokenCount).toBeGreaterThan(30);
        expect(tokenCount).toBeLessThan(200);
      });
    });

    it('should maintain content coverage without gaps', () => {
      const chunks = chunkText(STORIA_ROMANA_SAMPLE, {
        maxChunkSize: 600,
        overlap: 80,
      });

      // Verify key content is present across chunks
      const allContent = chunks.map((c) => c.content).join(' ');

      expect(allContent).toContain('Repubblica Romana');
      expect(allContent).toContain('Guerre Puniche');
      expect(allContent).toContain('Annibale');
      expect(allContent).toContain('Cesare');
      expect(allContent).toContain('Augusto');
    });

    it('should handle different chunk sizes appropriately', () => {
      const smallChunks = chunkText(STORIA_ROMANA_SAMPLE, { maxChunkSize: 300 });
      const mediumChunks = chunkText(STORIA_ROMANA_SAMPLE, { maxChunkSize: 600 });
      const largeChunks = chunkText(STORIA_ROMANA_SAMPLE, { maxChunkSize: 1200 });

      // Smaller max size should create more chunks
      expect(smallChunks.length).toBeGreaterThan(mediumChunks.length);
      expect(mediumChunks.length).toBeGreaterThan(largeChunks.length);
    });
  });

  describe('Educational Content Patterns', () => {
    it('should handle numbered lists in content', () => {
      const contentWithNumbers = `
La storia romana si divide in tre periodi:
1. La Monarchia (753-509 a.C.)
2. La Repubblica (509-27 a.C.)
3. L'Impero (27 a.C.-476 d.C.)

Ogni periodo ha le sue caratteristiche distintive.
`;

      const chunks = chunkText(contentWithNumbers, { maxChunkSize: 500 });
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('1.');
    });

    it('should handle dates and abbreviations common in history', () => {
      const datedContent = `
Nel 509 a.C. la monarchia fu abolita. Il prof. Rossi spiega che i consoli
governavano insieme. Nel 264 a.C. iniziò la prima guerra punica.
`;

      const chunks = chunkText(datedContent, { maxChunkSize: 500 });
      expect(chunks.length).toBeGreaterThan(0);
      // Should not split on "a.C." or "prof."
      expect(chunks[0].content).toContain('509 a.C.');
    });

    it('should handle proper nouns and Italian characters', () => {
      const italianContent = `
Città importanti: Roma, Cartagine, Atene.
Personaggi: Gaio Giulio Cesare, Marco Tullio Cicerone.
Eventi: la battaglia di Canne, le Idi di Marzo.
`;

      const chunks = chunkText(italianContent, { maxChunkSize: 500 });
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toContain('Cicerone');
    });
  });
});
