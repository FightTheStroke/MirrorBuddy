'use client';

import { useState, useCallback } from 'react';
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
  PencilRuler,
  FolderUp,
  Globe,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ToolCard } from './tool-card';
import { ToolMaestroSelectionDialog } from '@/components/education/tool-maestro-selection-dialog';
import { StudyKitView } from '@/components/study-kit/StudyKitView';
import type { ToolType } from '@/types/tools';
import type { Maestro } from '@/types';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import { PageHeader } from '@/components/ui/page-header';

interface Tool {
  id: ToolType;
  title: string;
  description: string;
  icon: typeof Brain;
  route: string;
}

interface ToolCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Pencil;
  tools: Tool[];
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'carica',
    title: 'Carica',
    subtitle: 'Importa i tuoi materiali per generare supporti di studio',
    icon: FolderUp,
    tools: [
      { id: 'pdf', title: 'Carica PDF', description: 'Carica un documento PDF e genera automaticamente materiali di studio', icon: Upload, route: '/pdf' },
      { id: 'webcam', title: 'Scatta Foto', description: 'Fotografa la lavagna o i tuoi appunti per generare materiali', icon: Camera, route: '/webcam' },
      { id: 'homework', title: 'Aiuto Compiti', description: 'Carica un esercizio e ricevi assistenza guidata passo-passo', icon: BookOpen, route: '/homework' },
      { id: 'study-kit', title: 'Study Kit', description: 'Carica un PDF e genera automaticamente riassunti, mappe, demo e quiz', icon: BookOpen, route: '/study-kit' },
    ],
  },
  {
    id: 'crea',
    title: 'Crea',
    subtitle: 'Genera materiali di studio con l\'aiuto dei Maestri',
    icon: Pencil,
    tools: [
      { id: 'mindmap', title: 'Mappa Mentale', description: 'Visualizza i collegamenti tra concetti con mappe interattive', icon: Brain, route: '/mindmap' },
      { id: 'quiz', title: 'Quiz', description: 'Verifica la tua comprensione con quiz personalizzati', icon: HelpCircle, route: '/quiz' },
      { id: 'flashcard', title: 'Flashcard', description: 'Memorizza con flashcard intelligenti e ripetizione spaziata', icon: Layers, route: '/flashcard' },
      { id: 'demo', title: 'Demo Interattiva', description: 'Esplora concetti STEM con simulazioni interattive', icon: Play, route: '/demo' },
      { id: 'summary', title: 'Riassunto', description: 'Genera sintesi chiare e strutturate dei concetti chiave', icon: FileText, route: '/summary' },
      { id: 'diagram', title: 'Diagramma', description: 'Crea diagrammi di flusso e schemi visivi', icon: GitBranch, route: '/diagram' },
      { id: 'timeline', title: 'Linea Temporale', description: 'Organizza eventi storici o sequenze in modo visivo', icon: Clock, route: '/timeline' },
      { id: 'formula', title: 'Formula', description: 'Visualizza e comprendi formule matematiche e scientifiche', icon: Calculator, route: '/formula' },
      { id: 'chart', title: 'Grafico', description: 'Crea grafici e visualizzazioni per dati e statistiche', icon: BarChart3, route: '/chart' },
    ],
  },
  {
    id: 'cerca',
    title: 'Cerca',
    subtitle: 'Trova risorse e approfondimenti sul web',
    icon: Globe,
    tools: [
      { id: 'search', title: 'Ricerca Web', description: 'Cerca informazioni, video e risorse educative sul web', icon: Search, route: '/search' },
    ],
  },
];


const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const categoryVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } },
};

export function AstuccioView() {
  const { enterFocusMode } = useUIStore();
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [isMaestroDialogOpen, setIsMaestroDialogOpen] = useState(false);
  const [pendingToolRoute, setPendingToolRoute] = useState<string | null>(null);
  const [pendingToolType, setPendingToolType] = useState<ToolType | null>(null);
  const [showStudyKit, setShowStudyKit] = useState(false);

  const handleToolClick = useCallback((route: string, toolId: ToolType) => {
    // Study Kit doesn't need maestro selection, show directly
    if (route === '/study-kit') {
      setShowStudyKit(true);
      return;
    }
    
    setSelectedTool(toolId);
    setPendingToolRoute(route);
    setPendingToolType(toolId);
    setIsMaestroDialogOpen(true);
  }, []);

  const handleMaestroConfirm = useCallback((maestro: Maestro, _mode: 'voice' | 'chat') => {
    if (pendingToolType && pendingToolRoute) {
      enterFocusMode({
        toolType: pendingToolType,
        maestroId: maestro.id,
        interactionMode: 'chat', // Always use chat mode
      });
    }
    setIsMaestroDialogOpen(false);
    setSelectedTool(null);
    setPendingToolRoute(null);
    setPendingToolType(null);
  }, [pendingToolType, pendingToolRoute, enterFocusMode]);

  const handleMaestroClose = useCallback(() => {
    setIsMaestroDialogOpen(false);
    setSelectedTool(null);
    setPendingToolRoute(null);
    setPendingToolType(null);
  }, []);

  // Show Study Kit view if selected
  if (showStudyKit) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <button
          onClick={() => setShowStudyKit(false)}
          className="mb-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-2"
        >
          ← Torna all&apos;Astuccio
        </button>
        <StudyKitView />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <PageHeader icon={PencilRuler} title="Il Tuo Astuccio" />

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-10">
        {TOOL_CATEGORIES.map((category) => {
          const CategoryIcon = category.icon;
          return (
            <motion.section key={category.id} variants={categoryVariants} className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/50 border-border">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-card shadow-sm">
                  <CategoryIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{category.title}</h2>
                  <p className="text-sm text-muted-foreground">{category.subtitle}</p>
                </div>
                <div className="ml-auto">
                  <span className="text-sm font-medium px-3 py-1 rounded-full bg-card border text-foreground">{category.tools.length} strumenti</span>
                </div>
              </div>
              <div className={cn('grid gap-4', category.tools.length === 1 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : category.tools.length <= 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}>
                {category.tools.map((tool, index) => (
                  <motion.div key={tool.route} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                    <ToolCard title={tool.title} description={tool.description} icon={tool.icon} onClick={() => handleToolClick(tool.route, tool.id)} isActive={selectedTool === tool.id} />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          );
        })}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-12 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">Come Funziona?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</span></div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Scegli lo Strumento</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Seleziona lo strumento piu adatto al tuo obiettivo di apprendimento</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-green-600 dark:text-green-400">2</span></div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Scegli il Maestro</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Ogni maestro ha un approccio unico per aiutarti a imparare</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</span></div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Salva nello Zaino</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">I materiali creati vengono salvati nel tuo Zaino per riusarli quando vuoi</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5" /> Consiglio per Studiare</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">Inizia con una <strong>Mappa Mentale</strong> per avere una visione d&apos;insieme, poi crea delle <strong>Flashcard</strong> per memorizzare i concetti chiave, e infine verifica la tua preparazione con un <strong>Quiz</strong>. Tutti i materiali saranno salvati nel tuo <strong>Zaino</strong>!</p>
      </motion.div>

      <ToolMaestroSelectionDialog isOpen={isMaestroDialogOpen} toolType={selectedTool ?? 'mindmap'} onConfirm={handleMaestroConfirm} onClose={handleMaestroClose} />
    </div>
  );
}
