'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Brain,
  FileQuestion,
  Layers,
  Globe,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Accessibility,
} from 'lucide-react';

const showcaseSections = [
  {
    href: '/showcase/maestri',
    title: 'Incontra i Professori',
    description: '17 AI tutors ispirati a grandi figure storiche. Da Euclide a Marie Curie, ogni professore ha il suo stile unico.',
    icon: GraduationCap,
    color: 'from-purple-500 to-indigo-600',
    stats: '17 Professori',
  },
  {
    href: '/showcase/mindmaps',
    title: 'Mappe Mentali',
    description: 'Visualizza concetti complessi con mappe interattive. Perfette per organizzare le idee e studiare.',
    icon: Brain,
    color: 'from-emerald-500 to-teal-600',
    stats: '3 Esempi',
  },
  {
    href: '/showcase/quiz',
    title: 'Quiz Interattivi',
    description: 'Testa le tue conoscenze con quiz adattivi. Feedback immediato e spiegazioni dettagliate.',
    icon: FileQuestion,
    color: 'from-amber-500 to-orange-600',
    stats: '10 Domande',
  },
  {
    href: '/showcase/flashcards',
    title: 'Flashcards FSRS',
    description: 'Memorizza con il sistema di ripetizione spaziata. L\'algoritmo FSRS-5 ottimizza il tuo apprendimento.',
    icon: Layers,
    color: 'from-blue-500 to-cyan-600',
    stats: '10 Cards',
  },
  {
    href: '/showcase/solar-system',
    title: 'Sistema Solare',
    description: 'Esplora l\'universo con una simulazione interattiva. Pianeti, orbite e dati scientifici.',
    icon: Globe,
    color: 'from-violet-500 to-purple-600',
    stats: 'Interattivo',
  },
  {
    href: '/showcase/accessibility',
    title: 'Accessibilita',
    description: 'Prova i 7 profili di accessibilita: dislessia, ADHD, autismo, visivo e altro. Testa le impostazioni in tempo reale.',
    icon: Accessibility,
    color: 'from-cyan-500 to-blue-600',
    stats: '7 Profili',
  },
  {
    href: '/showcase/chat',
    title: 'Chat Simulata',
    description: 'Prova una conversazione con Coach Melissa e Buddy Mario. Supporto emotivo e metodo di studio.',
    icon: MessageCircle,
    color: 'from-rose-500 to-pink-600',
    stats: '2 Personaggi',
  },
];

export default function ShowcaseHomePage() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/80 text-sm mb-6">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Modalita Showcase - Esplora senza LLM
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Esplora{' '}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            MirrorBuddy
          </span>
        </h1>

        <p className="text-lg text-white/70 max-w-2xl mx-auto">
          Scopri tutte le funzionalita della piattaforma educativa AI-powered.
          Contenuti statici per esplorare senza configurare un LLM.
        </p>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showcaseSections.map((section, index) => {
          const Icon = section.icon;

          return (
            <motion.div
              key={section.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={section.href}
                className="group block h-full"
              >
                <div className="h-full p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 transition-all duration-300 hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/10">
                  {/* Icon & Stats */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${section.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-white/50 font-medium px-2 py-1 bg-white/10 rounded-full">
                      {section.stats}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    {section.title}
                  </h3>

                  {/* Description */}
                  <p className="text-white/60 text-sm leading-relaxed mb-4">
                    {section.description}
                  </p>

                  {/* CTA */}
                  <div className="flex items-center gap-2 text-purple-400 text-sm font-medium group-hover:gap-3 transition-all">
                    Esplora
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-center"
      >
        <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-white/10">
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white mb-1">
              Pronto per l&apos;esperienza completa?
            </h3>
            <p className="text-white/60 text-sm">
              Configura Azure OpenAI o Ollama per conversazioni AI reali
            </p>
          </div>
          <Link
            href="/landing"
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Configura LLM
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
