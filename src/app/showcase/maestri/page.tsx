'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, Mic, Info, BookOpen } from 'lucide-react';
import { maestri, subjectNames, subjectIcons, subjectColors } from '@/data';
import type { Maestro, Subject } from '@/types';

export default function MaestriShowcasePage() {
  const [selectedMaestro, setSelectedMaestro] = useState<Maestro | null>(null);

  // Group maestri by subject
  const maestriBySubject = maestri.reduce(
    (acc, maestro) => {
      if (!acc[maestro.subject]) {
        acc[maestro.subject] = [];
      }
      acc[maestro.subject].push(maestro);
      return acc;
    },
    {} as Record<Subject, Maestro[]>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Incontra i{' '}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Professori
          </span>
        </h1>
        <p className="text-white/70 max-w-xl mx-auto">
          18 Professori AI ispirati a grandi figure storiche. Ogni professore ha il suo stile
          didattico unico, adattato per studenti con diverse esigenze.
        </p>
      </motion.div>

      {/* Maestri Grid by Subject */}
      <div className="space-y-10">
        {Object.entries(maestriBySubject).map(([subject, subjectMaestri], sectionIndex) => (
          <motion.section
            key={subject}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            {/* Subject Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{subjectIcons[subject as Subject]}</span>
              <h2 className="text-xl font-semibold text-white">
                {subjectNames[subject as Subject]}
              </h2>
              <div
                className="h-px flex-1 ml-2"
                style={{ backgroundColor: `${subjectColors[subject as Subject]}40` }}
              />
            </div>

            {/* Maestri Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subjectMaestri.map((maestro, index) => (
                <motion.button
                  key={maestro.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedMaestro(maestro)}
                  className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all duration-300 hover:bg-white/10 p-4 text-left"
                >
                  {/* Avatar */}
                  <div className="relative w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 ring-2 ring-white/10 group-hover:ring-purple-500/50 transition-all">
                    <Image
                      src={maestro.avatar}
                      alt={maestro.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  {/* Name & Specialty */}
                  <h3 className="text-center font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {maestro.name}
                  </h3>
                  <p className="text-center text-xs text-white/50 mt-1">
                    {maestro.specialty}
                  </p>

                  {/* Hover indicator */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      backgroundImage: `linear-gradient(to right, ${maestro.color}, ${maestro.color}80)`
                    }}
                  />
                </motion.button>
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      {/* Maestro Modal */}
      <AnimatePresence>
        {selectedMaestro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setSelectedMaestro(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Header with gradient */}
              <div
                className="p-6 pb-16"
                style={{
                  background: `linear-gradient(135deg, ${selectedMaestro.color}30, transparent)`
                }}
              >
                <button
                  onClick={() => setSelectedMaestro(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/20 bg-slate-800">
                    <Image
                      src={selectedMaestro.avatar}
                      alt={selectedMaestro.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedMaestro.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span>{subjectIcons[selectedMaestro.subject]}</span>
                      <span className="text-white/70">
                        {subjectNames[selectedMaestro.subject]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 pt-0 -mt-8">
                {/* Specialty */}
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-white/70">
                    Specialita: <span className="text-white font-medium">{selectedMaestro.specialty}</span>
                  </span>
                </div>

                {/* Teaching Style */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400" />
                    Stile Didattico
                  </h4>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {selectedMaestro.teachingStyle}
                  </p>
                </div>

                {/* Greeting */}
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-6">
                  <p className="text-sm text-white/90 italic">
                    &ldquo;{selectedMaestro.greeting}&rdquo;
                  </p>
                </div>

                {/* Voice Session Notice */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <Mic className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-200">
                      Sessione vocale non disponibile
                    </p>
                    <p className="text-xs text-amber-200/70">
                      Configura Azure OpenAI o Ollama per conversare con {selectedMaestro.name}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
