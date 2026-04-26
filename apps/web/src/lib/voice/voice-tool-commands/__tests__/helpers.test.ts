/**
 * Tests for Voice Tool Commands Helpers
 */

import { describe, it, expect } from 'vitest';
import {
  isMindmapModificationCommand,
  isSummaryModificationCommand,
  isOnboardingCommand,
  getToolTypeFromName,
  isToolCreationCommand,
  generateToolId,
} from '../helpers';

describe('voice-tool-commands-helpers', () => {
  describe('isMindmapModificationCommand', () => {
    const validCommands = [
      'mindmap_add_node',
      'mindmap_connect_nodes',
      'mindmap_expand_node',
      'mindmap_delete_node',
      'mindmap_focus_node',
      'mindmap_set_color',
    ];

    it.each(validCommands)('returns true for %s', (command) => {
      expect(isMindmapModificationCommand(command)).toBe(true);
    });

    it('returns false for invalid command', () => {
      expect(isMindmapModificationCommand('invalid_command')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isMindmapModificationCommand('')).toBe(false);
    });

    it('returns false for similar but non-matching commands', () => {
      expect(isMindmapModificationCommand('mindmap_create')).toBe(false);
      expect(isMindmapModificationCommand('mindmap')).toBe(false);
      expect(isMindmapModificationCommand('add_node')).toBe(false);
    });
  });

  describe('isSummaryModificationCommand', () => {
    const validCommands = [
      'summary_set_title',
      'summary_add_section',
      'summary_add_point',
      'summary_finalize',
      'student_summary_add_comment',
    ];

    it.each(validCommands)('returns true for %s', (command) => {
      expect(isSummaryModificationCommand(command)).toBe(true);
    });

    it('returns false for invalid command', () => {
      expect(isSummaryModificationCommand('invalid_command')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isSummaryModificationCommand('')).toBe(false);
    });

    it('returns false for similar but non-matching commands', () => {
      expect(isSummaryModificationCommand('summary_create')).toBe(false);
      expect(isSummaryModificationCommand('create_summary')).toBe(false);
    });
  });

  describe('isOnboardingCommand', () => {
    const validCommands = [
      'set_student_name',
      'set_student_age',
      'set_school_level',
      'set_learning_differences',
      'set_student_gender',
      'confirm_step_data',
      'next_onboarding_step',
      'prev_onboarding_step',
    ];

    it.each(validCommands)('returns true for %s', (command) => {
      expect(isOnboardingCommand(command)).toBe(true);
    });

    it('returns false for invalid command', () => {
      expect(isOnboardingCommand('invalid_command')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isOnboardingCommand('')).toBe(false);
    });

    it('returns false for similar but non-matching commands', () => {
      expect(isOnboardingCommand('set_student')).toBe(false);
      expect(isOnboardingCommand('onboarding_next')).toBe(false);
    });
  });

  describe('getToolTypeFromName', () => {
    it('maps create_mindmap to mindmap', () => {
      expect(getToolTypeFromName('create_mindmap')).toBe('mindmap');
    });

    it('maps create_quiz to quiz', () => {
      expect(getToolTypeFromName('create_quiz')).toBe('quiz');
    });

    it('maps create_flashcards to flashcard', () => {
      expect(getToolTypeFromName('create_flashcards')).toBe('flashcard');
    });

    it('maps create_summary to summary', () => {
      expect(getToolTypeFromName('create_summary')).toBe('summary');
    });

    it('maps open_student_summary to summary', () => {
      expect(getToolTypeFromName('open_student_summary')).toBe('summary');
    });

    it('maps create_diagram to diagram', () => {
      expect(getToolTypeFromName('create_diagram')).toBe('diagram');
    });

    it('maps create_timeline to timeline', () => {
      expect(getToolTypeFromName('create_timeline')).toBe('timeline');
    });

    it('maps create_demo to demo', () => {
      expect(getToolTypeFromName('create_demo')).toBe('demo');
    });

    it('returns null for unknown command', () => {
      expect(getToolTypeFromName('unknown_command')).toBe(null);
    });

    it('returns null for empty string', () => {
      expect(getToolTypeFromName('')).toBe(null);
    });

    it('returns null for modification commands', () => {
      expect(getToolTypeFromName('mindmap_add_node')).toBe(null);
      expect(getToolTypeFromName('summary_set_title')).toBe(null);
    });
  });

  describe('isToolCreationCommand', () => {
    const creationCommands = [
      'create_mindmap',
      'create_quiz',
      'create_flashcards',
      'create_summary',
      'open_student_summary',
      'create_diagram',
      'create_timeline',
      'create_demo',
    ];

    it.each(creationCommands)('returns true for %s', (command) => {
      expect(isToolCreationCommand(command)).toBe(true);
    });

    it('returns false for modification commands', () => {
      expect(isToolCreationCommand('mindmap_add_node')).toBe(false);
      expect(isToolCreationCommand('summary_set_title')).toBe(false);
    });

    it('returns false for onboarding commands', () => {
      expect(isToolCreationCommand('set_student_name')).toBe(false);
    });

    it('returns false for unknown commands', () => {
      expect(isToolCreationCommand('unknown_command')).toBe(false);
    });
  });

  describe('generateToolId', () => {
    it('generates unique IDs', () => {
      const id1 = generateToolId();
      const id2 = generateToolId();
      expect(id1).not.toBe(id2);
    });

    it('starts with voice-tool prefix', () => {
      const id = generateToolId();
      expect(id.startsWith('voice-tool-')).toBe(true);
    });

    it('contains timestamp', () => {
      const before = Date.now();
      const id = generateToolId();
      const after = Date.now();

      const parts = id.split('-');
      // voice-tool-{timestamp}-{uuid}
      const timestamp = parseInt(parts[2], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('has expected format', () => {
      const id = generateToolId();
      // Format: voice-tool-{timestamp}-{8-char-uuid}
      const pattern = /^voice-tool-\d+-[a-f0-9]{8}$/;
      expect(id).toMatch(pattern);
    });
  });
});
