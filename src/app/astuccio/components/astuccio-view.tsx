'use client';

/**
 * Astuccio View (Pencil Case - School Metaphor)
 * Creative tools hub - replaces Study Kit with school metaphor
 * Grid of tool cards for quick access to educational tools
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, HelpCircle, Layers, Play, FileText, Upload, Camera, Sparkles } from 'lucide-react';
import { ToolCard } from './tool-card';
import type { ToolType } from '@/types/tools';

const TOOLS = [
  {
    id: 'mindmap' as ToolType,
    title: 'Mappa Mentale',
    description: 'Visualizza i collegamenti tra concetti con mappe interattive',
    icon: Brain,
    color: 'blue',
    route: '/maestri?tool=mindmap',
  },
  {
    id: 'quiz' as ToolType,
    title: 'Quiz',
    description: 'Verifica la tua comprensione con quiz personalizzati',
    icon: HelpCircle,
    color: 'green',
    route: '/maestri?tool=quiz',
  },
  {
    id: 'demo' as ToolType,
    title: 'Demo Interattiva',
    description: 'Esplora concetti STEM con simulazioni interattive',
    icon: Play,
    color: 'purple',
    route: '/maestri?tool=demo',
  },
  {
    id: 'flashcard' as ToolType,
    title: 'Flashcard',
    description: 'Memorizza con flashcard intelligenti e ripetizione spaziata',
    icon: Layers,
    color: 'orange',
    route: '/maestri?tool=flashcard',
  },
  {
    id: 'summary' as ToolType,
    title: 'Riassunto',
    description: 'Genera sintesi chiare e strutturate dei concetti chiave',
    icon: FileText,
    color: 'cyan',
    route: '/maestri?tool=summary',
  },
  {
    id: 'pdf' as ToolType,
    title: 'Study Kit',
    description: 'Carica un PDF e genera automaticamente materiali di studio',
    icon: Upload,
    color: 'indigo',
    route: '/pdf-upload',
  },
  {
    id: 'webcam' as ToolType,
    title: 'Carica Materiale',
    description: 'Carica appunti, immagini o documenti per generare supporti',
    icon: Upload,
    color: 'teal',
    route: '/upload',
  },
  {
    id: 'webcam' as ToolType,
    title: 'Scatta Foto',
    description: 'Fotografa la lavagna o i tuoi appunti per generare materiali',
    icon: Camera,
    color: 'pink',
    route: '/webcam',
  },
];

export function AstuccioView() {
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);

  const handleToolClick = (route: string, toolId: ToolType) => {
    setSelectedTool(toolId);
    router.push(route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Il Tuo Astuccio
            </h1>
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Scegli lo strumento giusto per il tuo apprendimento.
            Ogni strumento è progettato per aiutarti a comprendere meglio.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {TOOLS.map((tool) => (
            <ToolCard
              key={tool.id}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              color={tool.color}
              onClick={() => handleToolClick(tool.route, tool.id)}
              isActive={selectedTool === tool.id}
            />
          ))}
        </div>

        {/* Info Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
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
                Inizia a Imparare
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Lo strumento si adatta al tuo ritmo e stile di apprendimento
              </p>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Consiglio
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Non sai quale strumento usare? Prova la{' '}
            <strong>Mappa Mentale</strong> per avere una visione d&apos;insieme,
            poi usa <strong>Flashcard</strong> per memorizzare i dettagli,
            e infine verifica con un <strong>Quiz</strong>!
          </p>
        </div>
      </div>
    </div>
  );
}
