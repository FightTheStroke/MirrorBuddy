import {
  GraduationCap,
  Brain,
  Mic,
  Gamepad2,
  Heart,
  Sparkles,
} from 'lucide-react';

export interface LandingFeature {
  icon: typeof GraduationCap;
  title: string;
  description: string;
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    icon: GraduationCap,
    title: '17 Professori AI',
    description:
      'Impara da figure storiche: Archimede, Leonardo, Galileo, Marie Curie e tanti altri',
  },
  {
    icon: Mic,
    title: 'Conversazioni Vocali',
    description:
      'Parla naturalmente con i tuoi tutor AI, come se fossero nella stanza con te',
  },
  {
    icon: Brain,
    title: 'Mappe Mentali',
    description:
      'Organizza le tue idee visivamente con mappe mentali generate automaticamente',
  },
  {
    icon: Gamepad2,
    title: 'Gamification',
    description:
      'Guadagna XP, sali di livello e mantieni le tue streak di studio',
  },
  {
    icon: Heart,
    title: 'Accessibilita',
    description:
      'Progettato per DSA, ADHD, autismo e paralisi cerebrale con supporto completo',
  },
  {
    icon: Sparkles,
    title: 'Coach e Buddy',
    description:
      'Melissa ti aiuta con i metodi di studio, Mario ti supporta emotivamente',
  },
];
