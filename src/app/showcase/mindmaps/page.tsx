'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Globe, History, Leaf } from 'lucide-react';
import { MindmapRenderer, createMindmapFromTopics } from '@/components/tools/markmap-renderer';

// Pre-built mindmaps for showcase
const showcaseMindmaps = [
  {
    id: 'solar-system',
    title: 'Il Sistema Solare',
    icon: Globe,
    color: 'from-blue-500 to-indigo-600',
    description: 'Esplora i pianeti e le loro caratteristiche principali',
    nodes: createMindmapFromTopics('Sistema Solare', [
      {
        name: 'Pianeti Rocciosi',
        subtopics: ['Mercurio', 'Venere', 'Terra', 'Marte'],
      },
      {
        name: 'Giganti Gassosi',
        subtopics: ['Giove', 'Saturno'],
      },
      {
        name: 'Giganti di Ghiaccio',
        subtopics: ['Urano', 'Nettuno'],
      },
      {
        name: 'Corpi Minori',
        subtopics: ['Cintura degli Asteroidi', 'Comete', 'Pianeti Nani'],
      },
    ]).nodes,
  },
  {
    id: 'french-revolution',
    title: 'La Rivoluzione Francese',
    icon: History,
    color: 'from-red-500 to-rose-600',
    description: 'Cause, eventi chiave e conseguenze della Rivoluzione',
    nodes: createMindmapFromTopics('Rivoluzione Francese', [
      {
        name: 'Cause',
        subtopics: ['Crisi finanziaria', 'Disuguaglianza sociale', 'Idee illuministe'],
      },
      {
        name: 'Eventi Chiave',
        subtopics: ['Presa della Bastiglia', 'Dichiarazione dei Diritti', 'Terrore', 'Termidoro'],
      },
      {
        name: 'Figure',
        subtopics: ['Luigi XVI', 'Robespierre', 'Maria Antonietta', 'Napoleone'],
      },
      {
        name: 'Conseguenze',
        subtopics: ['Fine della monarchia', 'Napoleone al potere', 'Diffusione ideali democratici'],
      },
    ]).nodes,
  },
  {
    id: 'photosynthesis',
    title: 'La Fotosintesi',
    icon: Leaf,
    color: 'from-green-500 to-emerald-600',
    description: 'Il processo che trasforma luce in energia',
    nodes: createMindmapFromTopics('Fotosintesi', [
      {
        name: 'Input',
        subtopics: ['Luce solare', 'Acqua (H2O)', 'Anidride carbonica (CO2)'],
      },
      {
        name: 'Processo',
        subtopics: ['Fase luminosa', 'Ciclo di Calvin', 'Cloroplasti'],
      },
      {
        name: 'Output',
        subtopics: ['Glucosio (C6H12O6)', 'Ossigeno (O2)'],
      },
      {
        name: 'Importanza',
        subtopics: ['Produzione ossigeno', 'Base catena alimentare', 'Ciclo del carbonio'],
      },
    ]).nodes,
  },
];

export default function MindmapsShowcasePage() {
  const [selectedMindmap, setSelectedMindmap] = useState<typeof showcaseMindmaps[0] | null>(null);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 p-3 rounded-xl bg-emerald-500/20 text-emerald-400 mb-4">
          <Brain className="w-6 h-6" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Mappe{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Mentali
          </span>
        </h1>
        <p className="text-white/70 max-w-xl mx-auto">
          Visualizza concetti complessi in modo chiaro e intuitivo.
          Clicca su una mappa per esplorarla in dettaglio.
        </p>
      </motion.div>

      {/* Mindmaps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {showcaseMindmaps.map((mindmap, index) => {
          const Icon = mindmap.icon;

          return (
            <motion.button
              key={mindmap.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedMindmap(mindmap)}
              className="group text-left p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 transition-all duration-300 hover:bg-white/10"
            >
              {/* Icon */}
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${mindmap.color} mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                {mindmap.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-white/60 mb-4">
                {mindmap.description}
              </p>

              {/* Preview tags */}
              <div className="flex flex-wrap gap-2">
                {mindmap.nodes.slice(0, 3).map((node) => (
                  <span
                    key={node.id}
                    className="px-2 py-1 text-xs bg-white/10 text-white/70 rounded-full"
                  >
                    {node.label}
                  </span>
                ))}
                {mindmap.nodes.length > 3 && (
                  <span className="px-2 py-1 text-xs bg-white/10 text-white/50 rounded-full">
                    +{mindmap.nodes.length - 3}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10"
      >
        <h3 className="text-lg font-semibold text-white mb-2">
          Come funzionano le Mappe Mentali?
        </h3>
        <p className="text-white/70 text-sm leading-relaxed">
          Durante le lezioni con i Maestri, puoi chiedere di creare mappe mentali su qualsiasi argomento.
          Il Maestro generer&agrave; una mappa visuale che ti aiuter&agrave; a comprendere e memorizzare i concetti.
          Potrai stamparle, scaricarle e usarle per studiare offline.
        </p>
      </motion.div>

      {/* Mindmap Modal */}
      <AnimatePresence>
        {selectedMindmap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedMindmap(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedMindmap.color}`}>
                    <selectedMindmap.icon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedMindmap.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedMindmap(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Mindmap Renderer */}
              <div className="flex-1 overflow-auto p-4 bg-white dark:bg-slate-950">
                <MindmapRenderer
                  title={selectedMindmap.title}
                  nodes={selectedMindmap.nodes}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
