/**
 * Mastery Display Tests
 * Tests for display helper functions
 */

import { describe, it, expect } from 'vitest';
import { getStatusLabel, getStatusEmoji, getStatusColor } from '../display';
import { SkillStatus } from '../types';

describe('mastery display functions', () => {
  describe('getStatusLabel', () => {
    it('should return "Mastered" for MASTERED status', () => {
      expect(getStatusLabel(SkillStatus.MASTERED)).toBe('Mastered');
    });

    it('should return "Proficient" for PROFICIENT status', () => {
      expect(getStatusLabel(SkillStatus.PROFICIENT)).toBe('Proficient');
    });

    it('should return "Familiar" for FAMILIAR status', () => {
      expect(getStatusLabel(SkillStatus.FAMILIAR)).toBe('Familiar');
    });

    it('should return "In Progress" for ATTEMPTED status', () => {
      expect(getStatusLabel(SkillStatus.ATTEMPTED)).toBe('In Progress');
    });

    it('should return "Not Started" for NOT_STARTED status', () => {
      expect(getStatusLabel(SkillStatus.NOT_STARTED)).toBe('Not Started');
    });

    it('should return "Unknown" for invalid status', () => {
      expect(getStatusLabel('invalid' as SkillStatus)).toBe('Unknown');
    });
  });

  describe('getStatusEmoji', () => {
    it('should return checkmark for MASTERED status', () => {
      expect(getStatusEmoji(SkillStatus.MASTERED)).toBe('✅');
    });

    it('should return green circle for PROFICIENT status', () => {
      expect(getStatusEmoji(SkillStatus.PROFICIENT)).toBe('🟢');
    });

    it('should return yellow circle for FAMILIAR status', () => {
      expect(getStatusEmoji(SkillStatus.FAMILIAR)).toBe('🟡');
    });

    it('should return orange circle for ATTEMPTED status', () => {
      expect(getStatusEmoji(SkillStatus.ATTEMPTED)).toBe('🟠');
    });

    it('should return white circle for NOT_STARTED status', () => {
      expect(getStatusEmoji(SkillStatus.NOT_STARTED)).toBe('⚪');
    });

    it('should return question mark for invalid status', () => {
      expect(getStatusEmoji('invalid' as SkillStatus)).toBe('❓');
    });
  });

  describe('getStatusColor', () => {
    it('should return green for MASTERED status', () => {
      expect(getStatusColor(SkillStatus.MASTERED)).toBe('#22c55e');
    });

    it('should return lime for PROFICIENT status', () => {
      expect(getStatusColor(SkillStatus.PROFICIENT)).toBe('#84cc16');
    });

    it('should return yellow for FAMILIAR status', () => {
      expect(getStatusColor(SkillStatus.FAMILIAR)).toBe('#eab308');
    });

    it('should return orange for ATTEMPTED status', () => {
      expect(getStatusColor(SkillStatus.ATTEMPTED)).toBe('#f97316');
    });

    it('should return slate for NOT_STARTED status', () => {
      expect(getStatusColor(SkillStatus.NOT_STARTED)).toBe('#94a3b8');
    });

    it('should return default slate for invalid status', () => {
      expect(getStatusColor('invalid' as SkillStatus)).toBe('#64748b');
    });
  });
});
