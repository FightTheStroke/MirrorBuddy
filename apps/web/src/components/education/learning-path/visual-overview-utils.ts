import type { LearningPathTopic, TopicStatus, TopicDifficulty } from '@/types';

// Status colors for topic nodes
export const STATUS_COLORS: Record<TopicStatus, { bg: string; border: string; text: string }> = {
  locked: { bg: '#374151', border: '#4b5563', text: '#9ca3af' },
  unlocked: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
  in_progress: { bg: '#7c2d12', border: '#f97316', text: '#fed7aa' },
  completed: { bg: '#14532d', border: '#22c55e', text: '#86efac' },
};

// Difficulty icons
export const DIFFICULTY_ICONS: Record<TopicDifficulty, string> = {
  basic: '📗',
  intermediate: '📙',
  advanced: '📕',
};

/**
 * Generate Mermaid flowchart code from topics
 */
export function generateMermaidCode(topics: LearningPathTopic[], compact: boolean = false): string {
  if (topics.length === 0) {
    return 'flowchart TD\n    empty["Nessun argomento"]';
  }

  const sortedTopics = [...topics].sort((a, b) => a.order - b.order);

  // Build flowchart
  let code = 'flowchart TD\n';

  // Add custom styles for each status
  code += `    classDef locked fill:${STATUS_COLORS.locked.bg},stroke:${STATUS_COLORS.locked.border},color:${STATUS_COLORS.locked.text}\n`;
  code += `    classDef unlocked fill:${STATUS_COLORS.unlocked.bg},stroke:${STATUS_COLORS.unlocked.border},color:${STATUS_COLORS.unlocked.text}\n`;
  code += `    classDef in_progress fill:${STATUS_COLORS.in_progress.bg},stroke:${STATUS_COLORS.in_progress.border},color:${STATUS_COLORS.in_progress.text}\n`;
  code += `    classDef completed fill:${STATUS_COLORS.completed.bg},stroke:${STATUS_COLORS.completed.border},color:${STATUS_COLORS.completed.text}\n`;

  // Add nodes
  sortedTopics.forEach((topic, index) => {
    const nodeId = `T${index}`;
    const diffIcon = DIFFICULTY_ICONS[topic.difficulty];
    const statusIcon = topic.status === 'completed' ? '✓ ' : topic.status === 'locked' ? '🔒 ' : '';
    const label = compact
      ? `${statusIcon}${topic.title}`
      : `${diffIcon} ${statusIcon}${topic.title}`;

    // Escape quotes in label
    const escapedLabel = label.replace(/"/g, "'");
    code += `    ${nodeId}["${escapedLabel}"]\n`;
  });

  // Add connections
  sortedTopics.forEach((topic, index) => {
    if (index < sortedTopics.length - 1) {
      const fromId = `T${index}`;
      const toId = `T${index + 1}`;
      const arrow = topic.status === 'completed' ? '-->' : '-.->';
      code += `    ${fromId} ${arrow} ${toId}\n`;
    }
  });

  // Apply classes
  sortedTopics.forEach((topic, index) => {
    const nodeId = `T${index}`;
    // Replace hyphen with underscore for CSS class name
    const statusClass = topic.status.replace('-', '_');
    code += `    class ${nodeId} ${statusClass}\n`;
  });

  return code;
}
