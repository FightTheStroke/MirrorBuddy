/**
 * Proposal Injector Service
 * Enables maestros to propose tools based on conversation context
 * Generates contextual instructions for maestro system prompt (F-01)
 */

import { getMaestroById } from '@/data/maestri';
import { TOOL_CONFIG } from '@/lib/tools/constants';

/**
 * Context information for tool proposal decision-making
 * Includes conversation state, topic, and available resources
 */
export interface ToolContext {
  topic?: string;
  subject?: string;
  keywords?: string[];
  sessionPhase?: 'greeting' | 'exploration' | 'practice' | 'assessment' | 'reflection';
  complexity?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * ToolProposal - Represents a tool the maestro can propose
 * Includes relevance scoring for smart suggestion ordering
 */
export interface ToolProposal {
  toolId: string;
  toolName: string;
  proposal: string;
  relevance: number; // 0-1, higher = more relevant to current context
  category: string;
}

/**
 * ProposalInjector - Manages maestro tool proposals
 * Determines which tools a maestro can suggest based on context
 * Generates instruction text for system prompt injection
 */
export class ProposalInjector {
  /**
   * Get available proposals for a maestro in current context
   * Filters tools based on maestro specialization and context relevance
   *
   * @param maestroId - The maestro identifier
   * @param context - Conversation and session context
   * @returns Array of available tool proposals, sorted by relevance
   */
  getAvailableProposals(maestroId: string, context: ToolContext): ToolProposal[] {
    const maestro = getMaestroById(maestroId);
    if (!maestro) {
      return [];
    }

    // Get maestro's available tools
    const availableToolIds = maestro.tools || [];
    if (availableToolIds.length === 0) {
      return [];
    }

    const proposals: ToolProposal[] = [];

    // Map each available tool to a proposal
    for (const toolId of availableToolIds) {
      const tool = TOOL_CONFIG[toolId];
      if (!tool) continue;

      // Calculate relevance based on context
      const relevance = this.calculateRelevance(toolId, context);
      if (relevance > 0) {
        proposals.push({
          toolId,
          toolName: tool.label,
          proposal: this.generateProposal(tool.label, context),
          relevance,
          category: tool.category,
        });
      }
    }

    // Sort by relevance (highest first)
    return proposals.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Generate instruction text to inject into maestro's system prompt
   * Tells maestro which tools it can propose in current context
   *
   * @param maestroId - The maestro identifier
   * @param context - Conversation and session context
   * @returns Instruction text for system prompt
   */
  injectProposalInstruction(maestroId: string, context: ToolContext): string {
    const proposals = this.getAvailableProposals(maestroId, context);

    if (proposals.length === 0) {
      return '';
    }

    // Sort by category for better organization
    const byCategory = this.groupByCategory(proposals);
    const instructionLines: string[] = [];

    instructionLines.push('## Available Tools');
    instructionLines.push(
      'Quando appropriato nel contesto della conversazione, puoi proporre questi strumenti:'
    );
    instructionLines.push('');

    for (const [category, tools] of Object.entries(byCategory)) {
      instructionLines.push(`### ${this.categoryLabel(category)}`);
      for (const tool of tools) {
        instructionLines.push(`- **${tool.toolName}**: ${tool.proposal}`);
      }
      instructionLines.push('');
    }

    instructionLines.push(
      'Suggerisci questi strumenti solo quando sono veramente utili per il tema in discussione.'
    );

    return instructionLines.join('\n');
  }

  /**
   * Calculate proposal relevance score (0-1) based on context
   * Higher scores indicate better fit for current conversation
   *
   * @param toolId - The tool identifier
   * @param context - Current context information
   * @returns Relevance score 0-1
   */
  private calculateRelevance(toolId: string, context: ToolContext): number {
    let relevance = 0.5; // Base relevance

    // Boost for session phase
    if (context.sessionPhase === 'practice' && toolId === 'quiz') {
      relevance = 0.9;
    } else if (context.sessionPhase === 'practice' && toolId === 'flashcard') {
      relevance = 0.85;
    } else if (context.sessionPhase === 'exploration' && toolId === 'mindmap') {
      relevance = 0.8;
    } else if (context.sessionPhase === 'assessment' && toolId === 'quiz') {
      relevance = 0.9;
    }

    // Boost for keyword matches
    if (context.keywords && context.keywords.length > 0) {
      const toolLower = toolId.toLowerCase();
      const hasMatch = context.keywords.some(
        kw => toolLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(toolLower)
      );
      if (hasMatch) {
        relevance = Math.max(relevance, 0.75);
      }
    }

    // Complexity adjustment
    if (context.complexity === 'advanced') {
      if (toolId === 'diagram' || toolId === 'mindmap') {
        relevance = Math.max(relevance, 0.75);
      }
    }

    return Math.min(relevance, 1);
  }

  /**
   * Generate human-readable proposal text for a tool
   * Describes what the tool can do
   *
   * @param toolName - User-friendly tool name
   * @param context - Session context
   * @returns Proposal description text
   */
  private generateProposal(toolName: string, context: ToolContext): string {
    const subject = context.subject || 'l\'argomento';
    const topic = context.topic || 'il concetto';

    // Tailor proposal based on tool type
    if (toolName.toLowerCase().includes('quiz')) {
      return `Testa la comprensione con domande su ${topic}`;
    } else if (toolName.toLowerCase().includes('flashcard')) {
      return `Memorizza i concetti chiave con flashcard su ${topic}`;
    } else if (toolName.toLowerCase().includes('mappa')) {
      return `Visualizza i collegamenti tra concetti di ${subject}`;
    } else if (toolName.toLowerCase().includes('riassunto')) {
      return `Genera un riassunto strutturato di ${topic}`;
    } else if (toolName.toLowerCase().includes('diagramma')) {
      return `Crea un diagramma per visualizzare ${topic}`;
    } else if (toolName.toLowerCase().includes('timeline')) {
      return `Organizza gli eventi in una sequenza temporale`;
    } else if (toolName.toLowerCase().includes('formula')) {
      return `Comprendi le formule matematiche di ${topic}`;
    } else if (toolName.toLowerCase().includes('grafico')) {
      return `Visualizza i dati con grafici e statistiche`;
    } else if (toolName.toLowerCase().includes('ricerca')) {
      return `Approfondisci ${topic} con ricerche sul web`;
    }

    return `Utilizza ${toolName.toLowerCase()} per approfondire ${topic}`;
  }

  /**
   * Group proposals by category for structured output
   *
   * @param proposals - Array of tool proposals
   * @returns Object with categories as keys, proposals as values
   */
  private groupByCategory(proposals: ToolProposal[]): Record<string, ToolProposal[]> {
    const grouped: Record<string, ToolProposal[]> = {};

    for (const proposal of proposals) {
      const category = proposal.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(proposal);
    }

    return grouped;
  }

  /**
   * Get human-readable label for category
   *
   * @param category - Category identifier
   * @returns User-friendly category name
   */
  private categoryLabel(category: string): string {
    const labels: Record<string, string> = {
      create: 'Crea',
      upload: 'Carica',
      search: 'Ricerca',
      other: 'Strumenti',
    };
    return labels[category] || category;
  }
}

/**
 * Factory function to create ProposalInjector
 * Provides convenient singleton access
 *
 * @returns ProposalInjector instance
 */
export function createProposalInjector(): ProposalInjector {
  return new ProposalInjector();
}
