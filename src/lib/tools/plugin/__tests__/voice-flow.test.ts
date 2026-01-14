/**
 * Integration tests for VoiceToolFlow - Core functionality
 * Tests complete voice-to-tool execution flow with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VoiceToolFlow } from '../voice-flow';
import { ToolOrchestrator, ToolExecutionContext } from '../orchestrator';
import { TriggerDetector } from '../trigger-detector';
import { VoiceFeedbackInjector } from '../voice-feedback';
import { ToolRegistry } from '../registry';
import { ToolCategory, Permission, ToolPlugin } from '../types';
import type { ToolResult } from '@/types/tools';
import { z } from 'zod';

// Mock ToolResult for successful execution
const createMockResult = (success: boolean = true, error?: string): ToolResult => ({
  success,
  error,
  data: success ? { itemCount: 5, title: 'Test Output' } : undefined,
  renderComponent: undefined,
});

// Mock plugin for testing
const mockPlugin: ToolPlugin = {
  id: 'create_summary',
  name: 'Summary Creator',
  category: ToolCategory.CREATION,
  schema: z.record(z.string(), z.unknown()),
  handler: vi.fn(async () => createMockResult(true)),
  voicePrompt: 'Creating a summary for you',
  voiceFeedback: 'I have created a summary with {itemCount} items',
  triggers: ['create summary', 'make summary', 'summarize'],
  prerequisites: [],
  permissions: [],
};

describe('VoiceToolFlow Integration Tests', () => {
  let registry: ToolRegistry;
  let orchestrator: ToolOrchestrator;
  let triggerDetector: TriggerDetector;
  let feedbackInjector: VoiceFeedbackInjector;
  let voiceFlow: VoiceToolFlow;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    registry = ToolRegistry.getInstance();
    registry.clear();
    registry.register(mockPlugin);

    orchestrator = new ToolOrchestrator(registry);
    triggerDetector = new TriggerDetector(registry);
    feedbackInjector = new VoiceFeedbackInjector(registry);
    voiceFlow = new VoiceToolFlow(orchestrator, triggerDetector, feedbackInjector);

    mockContext = {
      userId: 'test-user',
      sessionId: 'test-session',
      conversationHistory: [],
      userProfile: null,
      activeTools: [],
      grantedPermissions: [Permission.WRITE_CONTENT],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    registry.clear();
  });

  describe('processTranscript - Trigger Detection', () => {
    it('should detect trigger and execute tool on exact match', async () => {
      const transcript = 'Please create summary';
      const result = await voiceFlow.processTranscript(transcript, mockContext);

      expect(result.triggered).toBe(true);
      expect(result.toolId).toBe('create_summary');
      expect(result.result).toBeDefined();
      expect(result.result?.success).toBe(true);
      expect(result.voiceFeedback).toBeDefined();
    });

    it('should detect trigger with case-insensitive matching', async () => {
      const transcript = 'CREATE SUMMARY please';
      const result = await voiceFlow.processTranscript(transcript, mockContext);

      expect(result.triggered).toBe(true);
      expect(result.toolId).toBe('create_summary');
    });

    it('should return no trigger when transcript has no matching triggers', async () => {
      const transcript = 'Tell me about the weather';
      const result = await voiceFlow.processTranscript(transcript, mockContext);

      expect(result.triggered).toBe(false);
      expect(result.toolId).toBeUndefined();
      expect(result.result).toBeUndefined();
      expect(result.voiceFeedback).toContain('Non ho riconosciuto');
    });

    it('should return no trigger for empty transcript', async () => {
      const transcript = '';
      const result = await voiceFlow.processTranscript(transcript, mockContext);

      expect(result.triggered).toBe(false);
      expect(result.voiceFeedback).toContain('Non ho riconosciuto');
    });

    it('should return no trigger for whitespace-only transcript', async () => {
      const transcript = '   \t\n   ';
      const result = await voiceFlow.processTranscript(transcript, mockContext);

      expect(result.triggered).toBe(false);
    });
  });

  describe('processTranscript - Error Handling', () => {
    it('should handle tool execution errors gracefully', async () => {
      const errorPlugin = { ...mockPlugin };
      errorPlugin.handler = vi.fn(async () =>
        createMockResult(false, 'Tool execution failed')
      );

      registry.clear();
      registry.register(errorPlugin);
      orchestrator = new ToolOrchestrator(registry);
      voiceFlow = new VoiceToolFlow(orchestrator, triggerDetector, feedbackInjector);

      const transcript = 'create summary';
      const result = await voiceFlow.processTranscript(transcript, mockContext);

      expect(result.triggered).toBe(true);
      expect(result.result?.success).toBe(false);
    });

    it('should return error feedback when orchestrator throws', async () => {
      const errorPlugin = { ...mockPlugin };
      errorPlugin.handler = vi.fn(async () => {
        throw new Error('Handler error');
      });

      registry.clear();
      registry.register(errorPlugin);
      orchestrator = new ToolOrchestrator(registry);
      voiceFlow = new VoiceToolFlow(orchestrator, triggerDetector, feedbackInjector);

      const transcript = 'create summary';
      const result = await voiceFlow.processTranscript(transcript, mockContext);

      expect(result.triggered).toBe(true);
      expect(result.result?.success).toBe(false);
    });
  });

  describe('processTranscript - Voice Feedback', () => {
    it('should generate voice feedback for successful tool execution', async () => {
      const transcript = 'create summary';
      const result = await voiceFlow.processTranscript(transcript, mockContext);

      expect(result.triggered).toBe(true);
      expect(result.voiceFeedback).toBeDefined();
      expect(result.voiceFeedback).toContain('summary');
    });

    it('should provide appropriate error feedback when no match found', async () => {
      const transcript = 'talk about history';
      const result = await voiceFlow.processTranscript(transcript, mockContext);

      expect(result.triggered).toBe(false);
      expect(result.voiceFeedback).toContain('Non ho riconosciuto');
    });
  });

  describe('processTranscript - Multiple Triggers', () => {
    it('should select best match when multiple triggers could match', async () => {
      const secondPlugin: ToolPlugin = {
        ...mockPlugin,
        id: 'mind_map',
        name: 'Mind Map Creator',
        triggers: ['create mind map', 'map'],
        handler: vi.fn(async () => createMockResult(true)),
      };

      registry.register(secondPlugin);
      triggerDetector = new TriggerDetector(registry);
      feedbackInjector = new VoiceFeedbackInjector(registry);
      voiceFlow = new VoiceToolFlow(orchestrator, triggerDetector, feedbackInjector);

      const transcript = 'create summary now';
      const result = await voiceFlow.processTranscript(transcript, mockContext);

      expect(result.triggered).toBe(true);
      expect(result.toolId).toBe('create_summary');
    });
  });

  describe('VoiceToolFlow initialization', () => {
    it('should initialize with all required dependencies', () => {
      expect(voiceFlow).toBeDefined();
      expect(orchestrator).toBeDefined();
      expect(triggerDetector).toBeDefined();
      expect(feedbackInjector).toBeDefined();
    });

    it('should be ready to process transcripts immediately after init', async () => {
      const transcript = 'create summary';
      const result = await voiceFlow.processTranscript(transcript, mockContext);

      expect(result).toBeDefined();
      expect(result.voiceFeedback).toBeDefined();
    });
  });

  describe('createVoiceToolFlow factory', () => {
    it('should create VoiceToolFlow with registry dependencies', async () => {
      // Import the factory function
      const { createVoiceToolFlow } = await import('../voice-flow');

      // Reset singleton and get fresh instance
      (ToolRegistry as unknown as { instance: ToolRegistry | null })['instance'] = null;
      const factoryRegistry = ToolRegistry.getInstance();
      factoryRegistry.register(mockPlugin);

      const flow = createVoiceToolFlow(factoryRegistry);

      expect(flow).toBeInstanceOf(VoiceToolFlow);

      // Verify it can process transcripts
      const result = await flow.processTranscript('create summary', mockContext);
      expect(result.triggered).toBe(true);
    });
  });
});
