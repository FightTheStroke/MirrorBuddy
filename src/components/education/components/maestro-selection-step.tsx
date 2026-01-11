'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import type { Maestro, Subject } from '@/types';

interface MaestroSelectionStepProps {
  selectedSubject: Subject | null;
  availableMaestri: Maestro[];
  allMaestri: Maestro[];
  onMaestroSelect: (maestro: Maestro) => void;
}

const SUBJECT_LABELS: Record<string, string> = {
  mathematics: 'Matematica',
  physics: 'Fisica',
  chemistry: 'Chimica',
  biology: 'Biologia',
  history: 'Storia',
  geography: 'Geografia',
  italian: 'Italiano',
  english: 'Inglese',
  art: 'Arte',
  music: 'Musica',
  civics: 'Educazione Civica',
  economics: 'Economia',
  computerScience: 'Informatica',
  health: 'Salute',
  philosophy: 'Filosofia',
  internationalLaw: 'Diritto Internazionale',
  storytelling: 'Storytelling',
  astronomy: 'Astronomia',
  'computer-science': 'Informatica',
  'civic-education': 'Educazione Civica',
  science: 'Scienze',
  'physical-education': 'Educazione Fisica',
};

const getSubjectLabel = (subject: string): string => {
  return SUBJECT_LABELS[subject] || subject.charAt(0).toUpperCase() + subject.slice(1).replace(/-/g, ' ');
};

export function MaestroSelectionStep({
  selectedSubject,
  availableMaestri,
  allMaestri,
  onMaestroSelect,
}: MaestroSelectionStepProps) {
  return (
    <motion.div
      key="maestro"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <p className="text-slate-600 dark:text-slate-400 mb-4">
        {selectedSubject && availableMaestri.length > 0 ? (
          <>Scegli il Professore per <span className="font-semibold text-accent-themed">{getSubjectLabel(selectedSubject)}</span>:</>
        ) : (
          <>Nessun professore specifico per questa materia. Scegli tra tutti i Professori:</>
        )}
      </p>
      <div className="space-y-2">
        {(availableMaestri.length > 0 ? availableMaestri : allMaestri).map((maestro) => (
          <button
            key={maestro.id}
            onClick={() => onMaestroSelect(maestro)}
            className="w-full p-4 flex items-center gap-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-accent-themed hover:bg-accent-themed/5 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-md flex-shrink-0">
              <Image
                src={maestro.avatar}
                alt={maestro.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{maestro.name}</p>
              <p className="text-sm text-slate-500">{maestro.specialty}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-accent-themed" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
