/**
 * Tests for PDF Generator Content Helpers
 * Validates utility functions for study kit material processing
 */

import { describe, it, expect } from 'vitest';
import {
  isValidKitId,
  getMaterialById,
  extractMaterialSections,
  extractMaterialImages,
  calculateWordCount,
  estimateReadingTime,
} from '../content-helpers';

describe('isValidKitId', () => {
  it('returns true for valid UUID v4', () => {
    expect(isValidKitId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidKitId('6ba7b810-9dad-41d2-80b4-00c04fd430c8')).toBe(true);
  });

  it('returns false for invalid UUIDs', () => {
    expect(isValidKitId('')).toBe(false);
    expect(isValidKitId('not-a-uuid')).toBe(false);
    expect(isValidKitId('550e8400-e29b-31d4-a716-446655440000')).toBe(false); // v3 not v4
    expect(isValidKitId('550e8400-e29b-41d4-c716-446655440000')).toBe(false); // wrong variant
  });

  it('prevents SSRF with path traversal attempts', () => {
    expect(isValidKitId('../../../etc/passwd')).toBe(false);
    expect(isValidKitId('file:///etc/passwd')).toBe(false);
    expect(isValidKitId('http://evil.com/data')).toBe(false);
  });

  it('is case insensitive for hex characters', () => {
    expect(isValidKitId('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    expect(isValidKitId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });
});

describe('getMaterialById', () => {
  const studyKit = {
    summary: { content: 'Summary content' },
    mindmap: { central: 'Topic' },
    quiz: { questions: [] },
    demo: { type: 'interactive' },
  };

  it('returns summary for summary prefixed IDs', () => {
    expect(getMaterialById(studyKit, 'summary-123')).toBe(studyKit.summary);
    expect(getMaterialById(studyKit, 'summary_abc')).toBe(studyKit.summary);
  });

  it('returns mindmap for mindmap prefixed IDs', () => {
    expect(getMaterialById(studyKit, 'mindmap-456')).toBe(studyKit.mindmap);
  });

  it('returns quiz for quiz prefixed IDs', () => {
    expect(getMaterialById(studyKit, 'quiz-789')).toBe(studyKit.quiz);
  });

  it('returns demo for demo prefixed IDs', () => {
    expect(getMaterialById(studyKit, 'demo-abc')).toBe(studyKit.demo);
  });

  it('returns null for unknown prefixes', () => {
    expect(getMaterialById(studyKit, 'unknown-123')).toBeNull();
    expect(getMaterialById(studyKit, '')).toBeNull();
  });
});

describe('extractMaterialSections', () => {
  it('returns empty array for null material', () => {
    expect(extractMaterialSections(null)).toEqual([]);
  });

  it('returns empty array for non-object material', () => {
    expect(extractMaterialSections('string')).toEqual([]);
    expect(extractMaterialSections(123)).toEqual([]);
  });

  it('returns empty array for empty object', () => {
    expect(extractMaterialSections({})).toEqual([]);
  });

  it('extracts sections from summary with string content', () => {
    const material = {
      content: '# Title\n\nParagraph content here.',
    };
    const sections = extractMaterialSections(material);
    expect(sections.length).toBeGreaterThan(0);
  });

  it('extracts sections from quiz with questions', () => {
    const material = {
      questions: [{ text: 'Question 1?' }],
    };
    const sections = extractMaterialSections(material);
    expect(Array.isArray(sections)).toBe(true);
  });

  it('extracts sections from mindmap with nodes', () => {
    const material = {
      nodes: [{ text: 'Node 1' }],
    };
    const sections = extractMaterialSections(material);
    expect(Array.isArray(sections)).toBe(true);
  });

  it('extracts sections from mindmap with central', () => {
    const material = {
      central: 'Central topic',
    };
    const sections = extractMaterialSections(material);
    expect(Array.isArray(sections)).toBe(true);
  });
});

describe('extractMaterialImages', () => {
  it('returns empty array for null material', () => {
    expect(extractMaterialImages(null)).toEqual([]);
  });

  it('returns empty array for non-object material', () => {
    expect(extractMaterialImages('string')).toEqual([]);
  });

  it('returns empty array when no images property', () => {
    expect(extractMaterialImages({ content: 'text' })).toEqual([]);
  });

  it('extracts images from images array', () => {
    const material = {
      images: [
        { src: 'image1.jpg', alt: 'Image 1' },
        { url: 'image2.png', alt: 'Image 2', caption: 'Caption' },
      ],
    };
    const images = extractMaterialImages(material);

    expect(images).toHaveLength(2);
    expect(images[0].src).toBe('image1.jpg');
    expect(images[0].alt).toBe('Image 1');
    expect(images[1].src).toBe('image2.png');
    expect(images[1].caption).toBe('Caption');
  });

  it('uses default alt text when not provided', () => {
    const material = {
      images: [{ src: 'image.jpg' }],
    };
    const images = extractMaterialImages(material);

    expect(images[0].alt).toBe('Image');
  });

  it('skips non-object images', () => {
    const material = {
      images: ['string', null, { src: 'valid.jpg' }],
    };
    const images = extractMaterialImages(material);

    expect(images).toHaveLength(1);
    expect(images[0].src).toBe('valid.jpg');
  });
});

describe('calculateWordCount', () => {
  it('returns 0 for empty sections', () => {
    expect(calculateWordCount([])).toBe(0);
  });

  it('counts words in content', () => {
    const sections = [{ type: 'paragraph' as const, content: 'One two three four' }];
    expect(calculateWordCount(sections)).toBe(4);
  });

  it('counts words in list items', () => {
    const sections = [
      { type: 'list' as const, content: '', items: ['Item one', 'Item two three'] },
    ];
    expect(calculateWordCount(sections)).toBe(5);
  });

  it('combines content and items word counts', () => {
    const sections = [
      { type: 'paragraph' as const, content: 'Intro text' },
      { type: 'list' as const, content: '', items: ['First', 'Second'] },
    ];
    expect(calculateWordCount(sections)).toBe(4);
  });

  it('handles multiple whitespace correctly', () => {
    const sections = [{ type: 'paragraph' as const, content: 'Word   with   spaces' }];
    expect(calculateWordCount(sections)).toBe(3);
  });
});

describe('estimateReadingTime', () => {
  it('returns correct time for dyslexia profile (120 wpm)', () => {
    expect(estimateReadingTime(120, 'dyslexia')).toBe(1);
    expect(estimateReadingTime(240, 'dyslexia')).toBe(2);
  });

  it('returns correct time for dyscalculia profile (180 wpm)', () => {
    expect(estimateReadingTime(180, 'dyscalculia')).toBe(1);
    expect(estimateReadingTime(360, 'dyscalculia')).toBe(2);
  });

  it('returns correct time for dysgraphia profile (180 wpm)', () => {
    expect(estimateReadingTime(180, 'dysgraphia')).toBe(1);
  });

  it('returns correct time for dysorthography profile (150 wpm)', () => {
    expect(estimateReadingTime(150, 'dysorthography')).toBe(1);
    expect(estimateReadingTime(300, 'dysorthography')).toBe(2);
  });

  it('returns correct time for adhd profile (150 wpm)', () => {
    expect(estimateReadingTime(150, 'adhd')).toBe(1);
  });

  it('returns correct time for dyspraxia profile (140 wpm)', () => {
    expect(estimateReadingTime(140, 'dyspraxia')).toBe(1);
    expect(estimateReadingTime(280, 'dyspraxia')).toBe(2);
  });

  it('returns correct time for stuttering profile (100 wpm)', () => {
    expect(estimateReadingTime(100, 'stuttering')).toBe(1);
    expect(estimateReadingTime(200, 'stuttering')).toBe(2);
  });

  it('uses default 180 wpm for unknown profile', () => {
    expect(estimateReadingTime(180, 'unknown')).toBe(1);
    expect(estimateReadingTime(180, '')).toBe(1);
  });

  it('rounds up to next minute', () => {
    expect(estimateReadingTime(181, 'dyscalculia')).toBe(2);
    expect(estimateReadingTime(1, 'dyslexia')).toBe(1);
  });
});
