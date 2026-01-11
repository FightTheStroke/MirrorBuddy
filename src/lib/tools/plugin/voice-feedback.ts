/**
 * Voice Feedback Injector Service
 * Provides dynamic voice prompts and confirmations for tool creation
 * Supports template variable substitution for personalized voice interactions (F-01, F-13)
 */

import type { ToolContext, ToolResult } from '@/types/tools';
import type { VoicePromptConfig } from './types';
import { ToolRegistry } from './registry';

/**
 * Template variable mappings for proposal and confirmation feedback
 */
interface TemplateVariables {
  [key: string]: string | number | undefined;
}

/**
 * VoiceFeedbackInjector - Manages dynamic voice prompts and feedback
 * Substitutes context-aware variables into tool voice prompts and confirmations
 * Enables personalized voice interactions based on tool and conversation context
 */
export class VoiceFeedbackInjector {
  private registry: ToolRegistry;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  /**
   * Inject context variables into a tool's voice proposal prompt
   * Substitutes template variables like {toolName}, {topic}, {subject}
   *
   * @param toolId - The tool plugin ID
   * @param context - Conversation context with optional topic and subject
   * @returns Formatted voice prompt with substituted variables, or fallback if not found
   */
  injectProposal(toolId: string, context: ToolContext & { topic?: string; subject?: string }): string {
    const plugin = this.registry.get(toolId);
    if (!plugin) {
      return `Tool ${toolId} is not available.`;
    }

    const variables: TemplateVariables = {
      toolName: plugin.name,
      topic: context.topic || 'this topic',
      subject: context.subject || 'this subject',
    };

    const promptTemplate = this.extractPromptString(plugin.voicePrompt);
    return this.substituteVariables(promptTemplate, variables);
  }

  /**
   * Inject result data into a tool's voice confirmation feedback
   * Substitutes template variables like {toolName}, {itemCount}, {title}
   *
   * @param toolId - The tool plugin ID
   * @param result - Result object from tool execution containing item count and title
   * @returns Formatted voice feedback with substituted variables, or fallback if not found
   */
  injectConfirmation(
    toolId: string,
    result: ToolResult & { itemCount?: number; title?: string },
  ): string {
    const plugin = this.registry.get(toolId);
    if (!plugin) {
      return `Tool ${toolId} execution completed.`;
    }

    const variables: TemplateVariables = {
      toolName: plugin.name,
      itemCount: result.itemCount || 0,
      title: result.title || 'content',
    };

    const feedbackTemplate = this.extractPromptString(plugin.voiceFeedback);
    return this.substituteVariables(feedbackTemplate, variables);
  }

  /**
   * Analyze conversation context and suggest relevant tool plugins
   * Returns tool IDs that could be proposed based on conversation context
   * Uses trigger keywords and conversation metadata to match relevant tools
   *
   * @param context - Current conversation context
   * @returns Array of tool IDs that could be relevant to current context
   */
  getContextualTriggers(context: ToolContext & { topic?: string; keywords?: string[] }): string[] {
    const allPlugins = this.registry.getAll();
    const contextualTools: string[] = [];

    // Extract keywords from context
    const contextKeywords = context.keywords || [];
    if (context.topic) {
      contextKeywords.push(context.topic.toLowerCase());
    }

    // Find plugins whose triggers match context keywords
    for (const plugin of allPlugins) {
      if (!plugin.triggers) continue;

      const triggersMatch = plugin.triggers.some(trigger => {
        const triggerLower = trigger.toLowerCase();
        return contextKeywords.some(keyword =>
          triggerLower.includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(triggerLower),
        );
      });

      if (triggersMatch) {
        contextualTools.push(plugin.id);
      }
    }

    return contextualTools;
  }

  /**
   * Extract prompt string from either string or VoicePromptConfig
   * If VoicePromptConfig, uses template or fallback property
   *
   * @param prompt - Either a string or VoicePromptConfig object
   * @returns Extracted prompt string
   */
  private extractPromptString(prompt: string | VoicePromptConfig): string {
    if (typeof prompt === 'string') {
      return prompt;
    }
    return prompt.template || prompt.fallback || 'Tool executed successfully.';
  }

  /**
   * Replace template variables in a template string
   * Supports {variableName} syntax with fallback for undefined values
   *
   * @param template - Template string with {variableName} placeholders
   * @param variables - Object mapping variable names to values
   * @returns String with variables substituted
   */
  private substituteVariables(template: string, variables: TemplateVariables): string {
    return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });
  }
}

/**
 * Factory function to create VoiceFeedbackInjector with default registry
 * Provides convenient access to injector for most use cases
 *
 * @returns VoiceFeedbackInjector instance with singleton registry
 */
export function createVoiceFeedbackInjector(): VoiceFeedbackInjector {
  const registry = ToolRegistry.getInstance();
  return new VoiceFeedbackInjector(registry);
}
