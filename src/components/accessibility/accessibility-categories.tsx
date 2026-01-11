import {
  Eye,
  Brain,
  Hand,
  Star,
  TextIcon,
} from 'lucide-react';

export type AccessibilityCategory = 'dyslexia' | 'adhd' | 'visual' | 'motor' | 'presets';

export interface AccessibilityCategoryDef {
  id: AccessibilityCategory;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export const ACCESSIBILITY_CATEGORIES: AccessibilityCategoryDef[] = [
  {
    id: 'dyslexia',
    label: 'Dislessia',
    icon: <TextIcon className="w-5 h-5" />,
    description: 'Font, spaziatura e supporto TTS',
  },
  {
    id: 'adhd',
    label: 'ADHD',
    icon: <Brain className="w-5 h-5" />,
    description: 'Focus mode, timer e pause',
  },
  {
    id: 'visual',
    label: 'Visivo',
    icon: <Eye className="w-5 h-5" />,
    description: 'Contrasto e dimensioni testo',
  },
  {
    id: 'motor',
    label: 'Motorio',
    icon: <Hand className="w-5 h-5" />,
    description: 'Navigazione da tastiera',
  },
  {
    id: 'presets',
    label: 'Profili',
    icon: <Star className="w-5 h-5" />,
    description: 'Configurazioni rapide',
  },
];
