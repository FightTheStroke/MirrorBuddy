// ============================================================================
// TOOL CONTEXT BUILDER
// Formats tool outputs for AI context injection
// Part of T2-02: Context injection for generated content
// ============================================================================

import { prisma } from '@/lib/db';
import type { ToolType } from '@/types/tools';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ToolOutput {
  toolId: string;
  type: ToolType;
  title: string;
  content: Record<string, unknown>;
  createdAt: Date;
}

export interface ToolContextResult {
  formattedContext: string;
  toolCount: number;
  types: ToolType[];
}

// ============================================================================
// RETRIEVAL
// ============================================================================

/**
 * Get all tool outputs for a conversation
 */
export async function getToolOutputs(
  userId: string,
  conversationId: string
): Promise<ToolOutput[]> {
  try {
    const materials = await prisma.material.findMany({
      where: {
        userId,
        conversationId,
        status: 'active',
      },
      orderBy: { createdAt: 'asc' },
      select: {
        toolId: true,
        toolType: true,
        title: true,
        content: true,
        createdAt: true,
      },
    });

    return materials.map((m) => ({
      toolId: m.toolId,
      type: m.toolType as ToolType,
      title: m.title,
      content: JSON.parse(m.content) as Record<string, unknown>,
      createdAt: m.createdAt,
    }));
  } catch (error) {
    logger.error('Failed to retrieve tool outputs', {
      userId,
      conversationId,
      error: String(error),
    });
    return [];
  }
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format a single tool output for AI context
 */
export function formatToolOutput(output: ToolOutput): string {
  const { type, title, content } = output;

  switch (type) {
    case 'quiz':
      return formatQuiz(title, content);
    case 'flashcard':
      return formatFlashcards(title, content);
    case 'mindmap':
      return formatMindmap(title, content);
    case 'summary':
      return formatSummary(title, content);
    case 'demo':
      return formatDemo(title, content);
    case 'pdf':
      return formatPDF(title, content);
    case 'study-kit':
      return formatStudyKit(title, content);
    default:
      return formatGeneric(title, content);
  }
}

// Type-specific formatters
function formatQuiz(title: string, content: Record<string, unknown>): string {
  const questions = (content.questions as Array<{ question: string; correctAnswer: string }>) || [];
  const lines = [`**Quiz: ${title}**`];

  questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.question}`);
    lines.push(`   Risposta: ${q.correctAnswer}`);
  });

  return lines.join('\n');
}

function formatFlashcards(title: string, content: Record<string, unknown>): string {
  const cards = (content.cards as Array<{ front: string; back: string }>) || [];
  const lines = [`**Flashcard: ${title}**`];

  cards.slice(0, 5).forEach((card, i) => {
    lines.push(`${i + 1}. ${card.front} → ${card.back}`);
  });

  if (cards.length > 5) {
    lines.push(`   ... e altre ${cards.length - 5} flashcard`);
  }

  return lines.join('\n');
}

function formatMindmap(title: string, content: Record<string, unknown>): string {
  const root = content.root as { label: string } | undefined;
  const nodes = (content.nodes as Array<{ label: string }>) || [];

  const lines = [`**Mappa mentale: ${title}**`];
  if (root) {
    lines.push(`Concetto centrale: ${root.label}`);
  }
  lines.push(`Concetti collegati: ${nodes.slice(0, 5).map(n => n.label).join(', ')}`);

  if (nodes.length > 5) {
    lines.push(`... e altri ${nodes.length - 5} concetti`);
  }

  return lines.join('\n');
}

function formatSummary(title: string, content: Record<string, unknown>): string {
  const summary = content.summary as string || '';
  const preview = summary.length > 200 ? summary.substring(0, 200) + '...' : summary;

  return `**Riassunto: ${title}**\n${preview}`;
}

function formatDemo(title: string, content: Record<string, unknown>): string {
  const steps = (content.steps as Array<{ step: string }>) || [];
  const lines = [`**Demo: ${title}**`];

  steps.slice(0, 3).forEach((s, i) => {
    lines.push(`${i + 1}. ${s.step}`);
  });

  if (steps.length > 3) {
    lines.push(`... e altri ${steps.length - 3} passaggi`);
  }

  return lines.join('\n');
}

function formatPDF(title: string, content: Record<string, unknown>): string {
  const text = content.text as string || '';
  const preview = text.length > 150 ? text.substring(0, 150) + '...' : text;

  return `**PDF: ${title}**\n${preview}`;
}

function formatStudyKit(title: string, content: Record<string, unknown>): string {
  const sections = (content.sections as Array<{ title: string }>) || [];

  return `**Study Kit: ${title}**\nSezioni: ${sections.map(s => s.title).join(', ')}`;
}

function formatGeneric(title: string, content: Record<string, unknown>): string {
  return `**${title}**\n${JSON.stringify(content).substring(0, 100)}...`;
}

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

/**
 * Build formatted tool context for AI injection
 * Returns formatted string ready to inject into system prompt
 */
export async function buildToolContext(
  userId: string,
  conversationId: string
): Promise<ToolContextResult> {
  const outputs = await getToolOutputs(userId, conversationId);

  if (outputs.length === 0) {
    return {
      formattedContext: '',
      toolCount: 0,
      types: [],
    };
  }

  const lines = ['## Contenuti generati in questa sessione:'];
  lines.push('');

  outputs.forEach((output, i) => {
    lines.push(formatToolOutput(output));
    if (i < outputs.length - 1) {
      lines.push('');
    }
  });

  return {
    formattedContext: lines.join('\n'),
    toolCount: outputs.length,
    types: [...new Set(outputs.map(o => o.type))],
  };
}
