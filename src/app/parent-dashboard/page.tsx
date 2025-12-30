'use client';

import { ParentDashboard } from '@/components/profile/parent-dashboard';
import type { StudentInsights } from '@/types';

// Mock data for demonstration - in production this would come from API
const mockInsights: StudentInsights = {
  studentId: 'student-1',
  studentName: 'Marco',
  lastUpdated: new Date(),
  strengths: [
    {
      id: 'obs-1',
      maestroId: 'pitagora',
      maestroName: 'Pitagora',
      category: 'logical_reasoning',
      observation: 'Dimostra eccellente capacita di ragionamento logico, collegando concetti matematici in modo creativo.',
      isStrength: true,
      confidence: 0.9,
      createdAt: new Date(),
    },
    {
      id: 'obs-2',
      maestroId: 'galileo',
      maestroName: 'Galileo Galilei',
      category: 'scientific_curiosity',
      observation: 'Pone domande profonde sui fenomeni naturali e cerca sempre di capire il "perche" delle cose.',
      isStrength: true,
      confidence: 0.85,
      createdAt: new Date(),
    },
    {
      id: 'obs-3',
      maestroId: 'dante',
      maestroName: 'Dante Alighieri',
      category: 'creativity',
      observation: 'Ha una ricca immaginazione e usa metafore originali nelle sue espressioni.',
      isStrength: true,
      confidence: 0.8,
      createdAt: new Date(),
    },
    {
      id: 'obs-4',
      maestroId: 'michelangelo',
      maestroName: 'Michelangelo',
      category: 'artistic_sensitivity',
      observation: 'Mostra sensibilita artistica nel cogliere i dettagli delle opere.',
      isStrength: true,
      confidence: 0.75,
      createdAt: new Date(),
    },
  ],
  growthAreas: [
    {
      id: 'obs-5',
      maestroId: 'pitagora',
      maestroName: 'Pitagora',
      category: 'study_method',
      observation: 'Potrebbe beneficiare di una maggiore organizzazione nello studio, suddividendo i compiti in piccoli passi.',
      isStrength: false,
      confidence: 0.7,
      createdAt: new Date(),
    },
    {
      id: 'obs-6',
      maestroId: 'dante',
      maestroName: 'Dante Alighieri',
      category: 'verbal_expression',
      observation: 'Le idee sono ottime, ma a volte fatica a esprimerle in modo chiaro per iscritto.',
      isStrength: false,
      confidence: 0.65,
      createdAt: new Date(),
    },
  ],
  strategies: [
    {
      id: 'strat-1',
      title: 'Mappe Mentali per Organizzare',
      description: 'Utilizzare mappe mentali prima di iniziare un compito per visualizzare tutti i passaggi necessari.',
      suggestedBy: ['pitagora', 'galileo'],
      forAreas: ['study_method'],
      priority: 'high',
    },
    {
      id: 'strat-2',
      title: 'Dettatura Vocale',
      description: 'Provare a esprimere le idee a voce prima di scriverle, usando la dettatura vocale.',
      suggestedBy: ['dante'],
      forAreas: ['verbal_expression'],
      priority: 'medium',
    },
  ],
  learningStyle: {
    preferredChannel: 'visual',
    optimalSessionDuration: 25,
    preferredTimeOfDay: 'morning',
    motivators: ['Sfide pratiche', 'Esperimenti', 'Progetti creativi'],
    challengePreference: 'step_by_step',
  },
  totalSessions: 24,
  totalMinutes: 485,
  maestriInteracted: ['pitagora', 'galileo', 'dante', 'michelangelo', 'archimede'],
};

export default function ParentDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-8">
      <ParentDashboard insights={mockInsights} />
    </div>
  );
}
