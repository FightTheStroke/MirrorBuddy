import type { SavedHomework } from '@/lib/hooks/use-saved-materials/types';
import type { Homework } from '@/types';

export function toHomework(saved: SavedHomework): Homework {
  return {
    id: saved.id,
    title: saved.title,
    subject: saved.subject,
    problemType: saved.problemType,
    photoUrl: saved.photoUrl,
    steps: saved.steps,
    createdAt: saved.createdAt,
    completedAt: saved.completedAt,
  };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

