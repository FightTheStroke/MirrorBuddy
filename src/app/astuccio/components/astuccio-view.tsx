'use client';

/**
 * Astuccio View (Pencil Case - School Metaphor)
 * Creative tools hub with ALL 13 educational tools
 * Organized by category: Crea (Create), Carica (Upload), Cerca (Search)
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain,
  HelpCircle,
  Layers,
  Play,
  FileText,
  Upload,
  Camera,
  Search,
  GitBranch,
  Clock,
  Calculator,
  BarChart3,
  BookOpen,
  Sparkles,
  Pencil,
  FolderUp,
  Globe,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ToolCard } from './tool-card';
import type { ToolType } from '@/types/tools';
import { cn } from '@/lib/utils';

// Tool definitions organized by category
interface Tool {
  id: ToolType;
  title: string;
  description: string;
  icon: typeof Brain;
  color: string;
  route: string;
}

interface ToolCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Pencil;
  color: string;
  tools: Tool[];
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'crea',
    title: 'Crea',
    subtitle: 'Genera materiali di studio con l\'aiuto dei Maestri',
    icon: Pencil,
    color: 'blue',
    tools: [
      {
        id: 'mindmap',
        title: 'Mappa Mentale',
        description: 'Visualizza i collegamenti tra concetti con mappe interattive',
        icon: Brain,
        color: 'blue',
        route: '/mindmap',
      },
      {
        id: 'quiz',
        title: 'Quiz',
        description: 'Verifica la tua comprensione con quiz personalizzati',
        icon: HelpCircle,
        color: 'green',
        route: '/quiz',
      },
      {
        id: 'flashcard',
        title: 'Flashcard',
        description: 'Memorizza con flashcard intelligenti e ripetizione spaziata',
        icon: Layers,
        color: 'orange',
        route: '/flashcard',
      },
      {
        id: 'demo',
        title: 'Demo Interattiva',
        description: 'Esplora concetti STEM con simulazioni interattive',
        icon: Play,
        color: 'purple',
        route: '/demo',
      },
      {
        id: 'summary',
        title: 'Riassunto',
        description: 'Genera sintesi chiare e strutturate dei concetti chiave',
        icon: FileText,
        color: 'cyan',
        route: '/summary',
      },
      {
        id: 'diagram',
        title: 'Diagramma',
        description: 'Crea diagrammi di flusso e schemi visivi',
        icon: GitBranch,
        color: 'indigo',
        route: '/diagram',
      },
      {
        id: 'timeline',
        title: 'Linea Temporale',
        description: 'Organizza eventi storici o sequenze in modo visivo',
        icon: Clock,
        color: 'amber',
        route: '/timeline',
      },
      {
        id: 'formula',
        title: 'Formula',
        description: 'Visualizza e comprendi formule matematiche e scientifiche',
        icon: Calculator,
        color: 'rose',
        route: '/formula',
      },
      {
        id: 'chart',
        title: 'Grafico',
        description: 'Crea grafici e visualizzazioni per dati e statistiche',
        icon: BarChart3,
        color: 'emerald',
        route: '/chart',
      },
    ],
  },
  {
    id: 'carica',
    title: 'Carica',
    subtitle: 'Importa i tuoi materiali per generare supporti di studio',
    icon: FolderUp,
    color: 'teal',
    tools: [
      {
        id: 'pdf',
        title: 'Carica PDF',
        description: 'Carica un documento PDF e genera automaticamente materiali di studio',
        icon: Upload,
        color: 'teal',
        route: '/pdf',
      },
      {
        id: 'webcam',
        title: 'Scatta Foto',
        description: 'Fotografa la lavagna o i tuoi appunti per generare materiali',
        icon: Camera,
        color: 'pink',
        route: '/webcam',
      },
      {
        id: 'homework',
        title: 'Aiuto Compiti',
        description: 'Carica un esercizio e ricevi assistenza guidata passo-passo',
        icon: BookOpen,
        color: 'violet',
        route: '/homework',
      },
    ],
  },
  {
    id: 'cerca',
    title: 'Cerca',
    subtitle: 'Trova risorse e approfondimenti sul web',
    icon: Globe,
    color: 'sky',
    tools: [
      {
        id: 'search',
        title: 'Ricerca Web',
        description: 'Cerca informazioni, video e risorse educative sul web',
        icon: Search,
        color: 'sky',
        route: '/search',
      },
    ],
  },
];

// Category header colors
const CATEGORY_COLORS = {
  blue: {
    bg: 'bg-blue-100/50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    subtitle: 'text-blue-600 dark:text-blue-400',
  },
  teal: {
    bg: 'bg-teal-100/50 dark:bg-teal-900/20',
    border: 'border-teal-200 dark:border-teal-800',
    icon: 'text-teal-600 dark:text-teal-400',
    title: 'text-teal-900 dark:text-teal-100',
    subtitle: 'text-teal-600 dark:text-teal-400',
  },
  sky: {
    bg: 'bg-sky-100/50 dark:bg-sky-900/20',
    border: 'border-sky-200 dark:border-sky-800',
    icon: 'text-sky-600 dark:text-sky-400',
    title: 'text-sky-900 dark:text-sky-100',
    subtitle: 'text-sky-600 dark:text-sky-400',
  },
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const categoryVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as const, // easeOut bezier curve
    },
  },
};

export function AstuccioView() {
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);

  const handleToolClick = useCallback((route: string, toolId: ToolType) => {
    setSelectedTool(toolId);
    router.push(route);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" aria-hidden="true" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Il Tuo Astuccio
            </h1>
            <Sparkles className="w-10 h-10 text-primary animate-pulse" aria-hidden="true" />
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Tutti gli strumenti per studiare meglio.
            Scegli una categoria e inizia a creare i tuoi materiali.
          </p>
        </motion.div>

        {/* Tool Categories */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-10"
        >
          {TOOL_CATEGORIES.map((category) => {
            const colors = CATEGORY_COLORS[category.color as keyof typeof CATEGORY_COLORS];
            const CategoryIcon = category.icon;

            return (
              <motion.section
                key={category.id}
                variants={categoryVariants}
                className="space-y-4"
                aria-labelledby={`category-${category.id}`}
              >
                {/* Category Header */}
                <div
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border',
                    colors.bg,
                    colors.border
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      'bg-white dark:bg-slate-800 shadow-sm'
                    )}
                  >
                    <CategoryIcon className={cn('w-6 h-6', colors.icon)} aria-hidden="true" />
                  </div>
                  <div>
                    <h2
                      id={`category-${category.id}`}
                      className={cn('text-xl font-bold', colors.title)}
                    >
                      {category.title}
                    </h2>
                    <p className={cn('text-sm', colors.subtitle)}>
                      {category.subtitle}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span
                      className={cn(
                        'text-sm font-medium px-3 py-1 rounded-full',
                        'bg-white dark:bg-slate-800',
                        colors.title
                      )}
                    >
                      {category.tools.length} {category.tools.length === 1 ? 'strumento' : 'strumenti'}
                    </span>
                  </div>
                </div>

                {/* Tools Grid */}
                <div
                  className={cn(
                    'grid gap-4',
                    category.tools.length === 1
                      ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                      : category.tools.length <= 3
                        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                  )}
                >
                  {category.tools.map((tool, index) => (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ToolCard
                        title={tool.title}
                        description={tool.description}
                        icon={tool.icon}
                        color={tool.color}
                        onClick={() => handleToolClick(tool.route, tool.id)}
                        isActive={selectedTool === tool.id}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            );
          })}
        </motion.div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8"
        >
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">
            Come Funziona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Scegli lo Strumento
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Seleziona lo strumento più adatto al tuo obiettivo di apprendimento
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">2</span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Scegli il Maestro
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Ogni maestro ha un approccio unico per aiutarti a imparare
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                Salva nello Zaino
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                I materiali creati vengono salvati nel tuo Zaino per riusarli quando vuoi
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
        >
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            Consiglio per Studiare
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Inizia con una <strong>Mappa Mentale</strong> per avere una visione d&apos;insieme,
            poi crea delle <strong>Flashcard</strong> per memorizzare i concetti chiave,
            e infine verifica la tua preparazione con un <strong>Quiz</strong>.
            Tutti i materiali saranno salvati nel tuo <strong>Zaino</strong>!
          </p>
        </motion.div>
      </div>
    </div>
  );
}
