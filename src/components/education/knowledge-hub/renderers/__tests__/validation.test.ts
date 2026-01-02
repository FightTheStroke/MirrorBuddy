import { describe, expect, it } from 'vitest';
import {
  isObject,
  isArray,
  isString,
  isNumber,
  isBoolean,
  isValidMindmapData,
  isValidQuizData,
  isValidFlashcardData,
  isValidSummaryData,
  isValidChartData,
  isValidDiagramData,
  isValidTimelineData,
  isValidFormulaData,
  isValidHomeworkData,
  isValidDemoData,
  isValidImageData,
  isValidPdfData,
  validateRendererData,
  getValidator,
} from '../validation';

describe('Validation Utilities', () => {
  describe('Base type guards', () => {
    it('isObject returns true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });

    it('isObject returns false for non-objects', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
    });

    it('isArray returns true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
    });

    it('isArray returns false for non-arrays', () => {
      expect(isArray(null)).toBe(false);
      expect(isArray({})).toBe(false);
    });

    it('isString returns true for strings', () => {
      expect(isString('')).toBe(true);
      expect(isString('hello')).toBe(true);
    });

    it('isNumber returns true for valid numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(42)).toBe(true);
      expect(isNumber(-5.5)).toBe(true);
    });

    it('isNumber returns false for NaN', () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it('isBoolean returns true for booleans', () => {
      expect(isBoolean(true)).toBe(true);
      expect(isBoolean(false)).toBe(true);
    });
  });

  describe('isValidMindmapData', () => {
    it('returns true when data has markdown', () => {
      expect(isValidMindmapData({ markdown: '# Title' })).toBe(true);
    });

    it('returns true when data has nodes', () => {
      expect(isValidMindmapData({ nodes: [{ id: '1', label: 'Root' }] })).toBe(true);
    });

    it('returns false when data has neither markdown nor nodes', () => {
      expect(isValidMindmapData({ title: 'Test' })).toBe(false);
    });

    it('returns false for non-object data', () => {
      expect(isValidMindmapData(null)).toBe(false);
      expect(isValidMindmapData('string')).toBe(false);
    });
  });

  describe('isValidQuizData', () => {
    it('returns true for valid quiz data', () => {
      expect(
        isValidQuizData({
          questions: [
            {
              id: '1',
              question: 'What is 2+2?',
              options: [{ id: 'a', text: '4' }],
            },
          ],
        })
      ).toBe(true);
    });

    it('returns false when questions is not an array', () => {
      expect(isValidQuizData({ questions: 'not array' })).toBe(false);
    });

    it('returns false when question is missing required fields', () => {
      expect(isValidQuizData({ questions: [{ id: '1' }] })).toBe(false);
    });
  });

  describe('isValidFlashcardData', () => {
    it('returns true for valid flashcard data', () => {
      expect(
        isValidFlashcardData({
          cards: [{ id: '1', front: 'Question', back: 'Answer' }],
        })
      ).toBe(true);
    });

    it('returns false when cards is missing', () => {
      expect(isValidFlashcardData({})).toBe(false);
    });

    it('returns false when card is missing front/back', () => {
      expect(isValidFlashcardData({ cards: [{ front: 'Only front' }] })).toBe(false);
    });
  });

  describe('isValidSummaryData', () => {
    it('returns true for valid summary data', () => {
      expect(
        isValidSummaryData({
          sections: [{ title: 'Intro', content: 'Content here' }],
        })
      ).toBe(true);
    });

    it('returns false when sections is missing', () => {
      expect(isValidSummaryData({})).toBe(false);
    });
  });

  describe('isValidChartData', () => {
    it('returns true for valid chart types', () => {
      expect(isValidChartData({ type: 'bar' })).toBe(true);
      expect(isValidChartData({ type: 'line' })).toBe(true);
      expect(isValidChartData({ type: 'pie' })).toBe(true);
    });

    it('returns false for invalid chart type', () => {
      expect(isValidChartData({ type: 'invalid' })).toBe(false);
    });

    it('returns true when type is not specified', () => {
      expect(isValidChartData({})).toBe(true);
    });
  });

  describe('isValidDiagramData', () => {
    it('returns true when code is present', () => {
      expect(isValidDiagramData({ code: 'graph TD; A-->B' })).toBe(true);
    });

    it('returns false when code is missing or empty', () => {
      expect(isValidDiagramData({})).toBe(false);
      expect(isValidDiagramData({ code: '' })).toBe(false);
    });
  });

  describe('isValidTimelineData', () => {
    it('returns true for valid timeline data', () => {
      expect(
        isValidTimelineData({
          events: [{ id: '1', date: '2024-01-01', title: 'Event' }],
        })
      ).toBe(true);
    });

    it('returns false when events is missing required fields', () => {
      expect(isValidTimelineData({ events: [{ id: '1' }] })).toBe(false);
    });
  });

  describe('isValidFormulaData', () => {
    it('returns true when formula is present', () => {
      expect(isValidFormulaData({ formula: 'E = mc^2' })).toBe(true);
    });

    it('returns false when formula is missing or empty', () => {
      expect(isValidFormulaData({})).toBe(false);
      expect(isValidFormulaData({ formula: '' })).toBe(false);
    });
  });

  describe('isValidHomeworkData', () => {
    it('returns true for valid homework data', () => {
      expect(
        isValidHomeworkData({
          tasks: [{ id: '1', description: 'Complete exercise 1' }],
        })
      ).toBe(true);
    });

    it('returns false when tasks is missing description', () => {
      expect(isValidHomeworkData({ tasks: [{ id: '1' }] })).toBe(false);
    });
  });

  describe('isValidDemoData', () => {
    it('returns true when html is present', () => {
      expect(isValidDemoData({ html: '<div>Hello</div>' })).toBe(true);
    });

    it('returns true when code is present', () => {
      expect(isValidDemoData({ code: 'console.log("hi")' })).toBe(true);
    });

    it('returns false when neither html nor code is present', () => {
      expect(isValidDemoData({})).toBe(false);
    });
  });

  describe('isValidImageData', () => {
    it('returns true when src is present', () => {
      expect(isValidImageData({ src: 'https://example.com/image.png' })).toBe(true);
    });

    it('returns false when src is missing or empty', () => {
      expect(isValidImageData({})).toBe(false);
      expect(isValidImageData({ src: '' })).toBe(false);
    });
  });

  describe('isValidPdfData', () => {
    it('returns true when url is present', () => {
      expect(isValidPdfData({ url: 'https://example.com/doc.pdf' })).toBe(true);
    });

    it('returns false when url is missing or empty', () => {
      expect(isValidPdfData({})).toBe(false);
      expect(isValidPdfData({ url: '' })).toBe(false);
    });
  });

  describe('getValidator', () => {
    it('returns validator function for known types', () => {
      expect(getValidator('mindmap')).toBe(isValidMindmapData);
      expect(getValidator('quiz')).toBe(isValidQuizData);
      expect(getValidator('flashcard')).toBe(isValidFlashcardData);
    });

    it('returns null for unknown types', () => {
      expect(getValidator('unknown')).toBe(null);
      expect(getValidator('search')).toBe(null);
    });
  });

  describe('validateRendererData', () => {
    it('returns valid for correct data', () => {
      const result = validateRendererData('mindmap', { markdown: '# Test' });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns invalid with error message for incorrect data', () => {
      const result = validateRendererData('mindmap', {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mindmap');
    });

    it('returns valid for unknown types (no validator)', () => {
      const result = validateRendererData('unknown', { any: 'data' });
      expect(result.valid).toBe(true);
    });
  });
});
