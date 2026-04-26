import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { ONBOARDING_TOOLS } from './tool-definitions';

export function isOnboardingTool(name: string): boolean {
  return ONBOARDING_TOOLS.some((tool) => tool.name === name);
}

export function getOnboardingDataSummary(): string {
  const { data } = useOnboardingStore.getState();

  const parts: string[] = [];

  if (data.name) {
    parts.push(`nome: ${data.name}`);
  }
  if (data.age) {
    parts.push(`età: ${data.age} anni`);
  }
  if (data.schoolLevel) {
    const levelNames = {
      elementare: 'scuola elementare',
      media: 'scuola media',
      superiore: 'scuola superiore',
    };
    parts.push(`scuola: ${levelNames[data.schoolLevel]}`);
  }
  if (data.learningDifferences && data.learningDifferences.length > 0) {
    const diffNames: Record<string, string> = {
      dyslexia: 'dislessia',
      dyscalculia: 'discalculia',
      dysgraphia: 'disgrafia',
      adhd: 'ADHD',
      autism: 'autismo',
      cerebralPalsy: 'paralisi cerebrale',
      visualImpairment: 'difficoltà visive',
      auditoryProcessing: 'difficoltà uditive',
    };
    const names = data.learningDifferences.map((d) => diffNames[d] || d);
    parts.push(`difficoltà: ${names.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(', ') : 'nessun dato raccolto ancora';
}

