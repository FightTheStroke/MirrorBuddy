import { getToolTypeFromName } from '@/lib/voice/voice-tool-commands/helpers';
import { useMethodProgressStore } from '@/lib/stores/method-progress-store';
import type { Subject, ToolType } from '@/lib/method-progress/types';

const subjects: Record<string, Subject> = {
  mathematics: 'matematica',
  math: 'matematica',
  matematica: 'matematica',
  italian: 'italiano',
  italiano: 'italiano',
  history: 'storia',
  storia: 'storia',
  geography: 'geografia',
  geografia: 'geografia',
  science: 'scienze',
  scienze: 'scienze',
  physics: 'scienze',
  biology: 'scienze',
  english: 'inglese',
  inglese: 'inglese',
  art: 'arte',
  arte: 'arte',
  music: 'musica',
  musica: 'musica',
};

export function recordVoiceToolProgress(toolName: string, subject: unknown): void {
  const tool = getToolTypeFromName(toolName);
  if (!tool) return;
  const methodTool: ToolType =
    tool === 'mindmap'
      ? 'mind_map'
      : tool === 'flashcard'
        ? 'flashcard'
        : tool === 'quiz'
          ? 'quiz'
          : tool === 'summary'
            ? 'summary'
            : 'diagram';
  const mappedSubject = subject ? (subjects[String(subject).toLowerCase()] ?? 'other') : undefined;
  useMethodProgressStore.getState().recordToolCreation(methodTool, 'hints', mappedSubject);
}
