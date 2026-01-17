/**
 * Tests for Quiz Content Parser
 */

import { describe, it, expect } from 'vitest';
import { extractQuizSections } from '../quiz-parser';

describe('extractQuizSections', () => {
  it('always includes Quiz di Verifica heading', () => {
    const sections = extractQuizSections({});
    expect(sections[0]).toEqual({
      type: 'heading',
      content: 'Quiz di Verifica',
      level: 2,
    });
  });

  it('extracts questions as paragraphs', () => {
    const quiz = {
      questions: [
        { question: 'What is 2+2?' },
        { question: 'What is the capital of Italy?' },
      ],
    };
    const sections = extractQuizSections(quiz);
    const paragraphs = sections.filter(s => s.type === 'paragraph');

    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].content).toBe('Domanda 1: What is 2+2?');
    expect(paragraphs[1].content).toBe('Domanda 2: What is the capital of Italy?');
  });

  it('extracts options as list items', () => {
    const quiz = {
      questions: [
        { question: 'What is 2+2?', options: ['3', '4', '5'] },
      ],
    };
    const sections = extractQuizSections(quiz);
    const list = sections.find(s => s.type === 'list');

    expect(list).toBeDefined();
    expect(list?.content).toBe('Opzioni:');
    expect(list?.items).toEqual(['3', '4', '5']);
  });

  it('extracts explanations as quotes', () => {
    const quiz = {
      questions: [
        { question: 'What is 2+2?', explanation: 'Basic arithmetic' },
      ],
    };
    const sections = extractQuizSections(quiz);
    const quote = sections.find(s => s.type === 'quote');

    expect(quote).toBeDefined();
    expect(quote?.content).toBe('Spiegazione: Basic arithmetic');
  });

  it('handles question with all fields', () => {
    const quiz = {
      questions: [
        {
          question: 'Test question',
          options: ['A', 'B', 'C'],
          explanation: 'This is why',
        },
      ],
    };
    const sections = extractQuizSections(quiz);

    expect(sections).toHaveLength(4); // heading + paragraph + list + quote
    expect(sections[1].type).toBe('paragraph');
    expect(sections[2].type).toBe('list');
    expect(sections[3].type).toBe('quote');
  });

  it('handles empty questions array', () => {
    const quiz = { questions: [] };
    const sections = extractQuizSections(quiz);

    expect(sections).toHaveLength(1); // Only heading
  });

  it('handles missing questions property', () => {
    const quiz = { title: 'My Quiz' };
    const sections = extractQuizSections(quiz);

    expect(sections).toHaveLength(1); // Only heading
  });

  it('handles question without options', () => {
    const quiz = {
      questions: [
        { question: 'Open-ended question' },
      ],
    };
    const sections = extractQuizSections(quiz);
    const list = sections.find(s => s.type === 'list');

    expect(list).toBeUndefined();
  });

  it('handles question without explanation', () => {
    const quiz = {
      questions: [
        { question: 'Simple question', options: ['Yes', 'No'] },
      ],
    };
    const sections = extractQuizSections(quiz);
    const quote = sections.find(s => s.type === 'quote');

    expect(quote).toBeUndefined();
  });

  it('handles multiple questions with mixed content', () => {
    const quiz = {
      questions: [
        { question: 'Q1', options: ['A', 'B'] },
        { question: 'Q2', explanation: 'Reason' },
        { question: 'Q3', options: ['X', 'Y', 'Z'], explanation: 'Full' },
      ],
    };
    const sections = extractQuizSections(quiz);

    // Count: 1 heading + 3 paragraphs + 2 lists + 2 quotes = 8
    expect(sections).toHaveLength(8);
  });

  it('numbers questions correctly', () => {
    const quiz = {
      questions: [
        { question: 'First' },
        { question: 'Second' },
        { question: 'Third' },
      ],
    };
    const sections = extractQuizSections(quiz);
    const paragraphs = sections.filter(s => s.type === 'paragraph');

    expect(paragraphs[0].content).toContain('Domanda 1');
    expect(paragraphs[1].content).toContain('Domanda 2');
    expect(paragraphs[2].content).toContain('Domanda 3');
  });
});
