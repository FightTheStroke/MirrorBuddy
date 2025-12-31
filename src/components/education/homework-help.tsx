'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  Lightbulb,
  CheckCircle,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
  Image as ImageIcon,
  FileText,
  ChevronLeft,
  Sparkles,
  Target,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// Set up PDF.js worker (required for PDF rendering)
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WebcamCapture } from '@/components/tools/webcam-capture';
import type { Homework, HomeworkStep } from '@/types';

// Maximum pages to process from PDF (performance + cost limit)
const MAX_PDF_PAGES = 5;

interface HomeworkHelpProps {
  homework?: Homework;
  onSubmitPhoto: (photo: File) => Promise<Homework>;
  onCompleteStep: (stepId: string) => void;
  onAskQuestion: (question: string) => void;
}

export function HomeworkHelp({
  homework,
  onSubmitPhoto,
  onCompleteStep,
  onAskQuestion,
}: HomeworkHelpProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showHints, setShowHints] = useState<Record<string, number>>({});
  const [question, setQuestion] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF state
  const [isPdf, setIsPdf] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [analyzedPage, setAnalyzedPage] = useState<number | null>(null); // Track which page was analyzed

  // Render a PDF page to image data URL
  const renderPdfPage = useCallback(async (pdfDoc: pdfjs.PDFDocumentProxy, pageNum: number): Promise<string> => {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // canvas property required for pdfjs-dist v5
    await page.render({ canvasContext: context, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
    return canvas.toDataURL('image/png');
  }, []);

  // Analyze a specific PDF page
  const analyzePdfPage = useCallback(async (pageIndex: number) => {
    if (!pdfPages[pageIndex]) return;

    setIsUploading(true);
    try {
      const response = await fetch(pdfPages[pageIndex]);
      const blob = await response.blob();
      const imageFile = new File([blob], `pdf-page-${pageIndex + 1}.png`, { type: 'image/png' });
      await onSubmitPhoto(imageFile);
      setAnalyzedPage(pageIndex);
    } finally {
      setIsUploading(false);
    }
  }, [pdfPages, onSubmitPhoto]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error state
    setPdfError(null);

    // Check if PDF
    if (file.type === 'application/pdf') {
      setIsPdf(true);
      setIsUploading(true);
      setAnalyzedPage(null);

      try {
        const arrayBuffer = await file.arrayBuffer();

        // Try to load PDF - this will fail for encrypted/corrupt files
        let pdf: pdfjs.PDFDocumentProxy;
        try {
          pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        } catch (pdfLoadError) {
          const errorMsg = pdfLoadError instanceof Error ? pdfLoadError.message : 'Errore sconosciuto';
          if (errorMsg.includes('password') || errorMsg.includes('encrypted')) {
            setPdfError('Questo PDF è protetto da password. Rimuovi la protezione e riprova.');
          } else {
            setPdfError('Impossibile leggere il PDF. Il file potrebbe essere corrotto.');
          }
          setIsUploading(false);
          return;
        }

        const totalPages = pdf.numPages;
        const pagesToRender = Math.min(totalPages, MAX_PDF_PAGES);
        setPdfTotalPages(pagesToRender);

        // Show warning if PDF has more pages than limit
        if (totalPages > MAX_PDF_PAGES) {
          setPdfError(`Il PDF ha ${totalPages} pagine. Verranno caricate solo le prime ${MAX_PDF_PAGES}.`);
        }

        // Render pages up to limit
        const pageImages: string[] = [];
        for (let i = 1; i <= pagesToRender; i++) {
          const imageData = await renderPdfPage(pdf, i);
          pageImages.push(imageData);
        }
        setPdfPages(pageImages);
        setCurrentPage(0);
        setPhotoPreview(pageImages[0]);

        // Auto-analyze first page
        const response = await fetch(pageImages[0]);
        const blob = await response.blob();
        const imageFile = new File([blob], 'pdf-page-1.png', { type: 'image/png' });
        await onSubmitPhoto(imageFile);
        setAnalyzedPage(0);
      } catch (error) {
        console.error('PDF processing error:', error);
        setPdfError('Errore durante l\'elaborazione del PDF. Riprova.');
      } finally {
        setIsUploading(false);
      }
    } else {
      // Regular image handling
      setIsPdf(false);
      setPdfPages([]);

      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      setIsUploading(true);
      try {
        await onSubmitPhoto(file);
      } finally {
        setIsUploading(false);
      }
    }
  }, [onSubmitPhoto, renderPdfPage]);

  // Handle webcam capture - convert base64 to File
  const handleWebcamCapture = useCallback(async (imageData: string) => {
    setShowWebcam(false);
    setPhotoPreview(imageData);

    // Convert base64 to File
    const response = await fetch(imageData);
    const blob = await response.blob();
    const file = new File([blob], 'homework-photo.jpg', { type: 'image/jpeg' });

    // Upload and analyze
    setIsUploading(true);
    try {
      await onSubmitPhoto(file);
    } finally {
      setIsUploading(false);
    }
  }, [onSubmitPhoto]);

  const handleShowNextHint = useCallback((stepId: string, totalHints: number) => {
    setShowHints(prev => ({
      ...prev,
      [stepId]: Math.min((prev[stepId] || 0) + 1, totalHints),
    }));
  }, []);

  const handleAskQuestion = useCallback(() => {
    if (question.trim()) {
      onAskQuestion(question);
      setQuestion('');
    }
  }, [question, onAskQuestion]);

  // Upload view (no homework yet)
  if (!homework) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - centered */}
        <div className="text-center xl:text-left">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 mx-auto xl:mx-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3 shadow-lg"
          >
            <BookOpen className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Materiali di Studio
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto xl:mx-0">
            Carica i tuoi esercizi e riceverai una guida personalizzata passo-passo con il metodo maieutico.
          </p>
        </div>

        {/* PDF error (blocking - no preview available) */}
        {pdfError && !photoPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                      Errore nel caricamento PDF
                    </h3>
                    <p className="text-red-700 dark:text-red-300 text-sm">
                      {pdfError}
                    </p>
                  </div>
                  <button
                    onClick={() => setPdfError(null)}
                    className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                    aria-label="Chiudi messaggio"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Photo/PDF preview */}
        {photoPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="p-6">
                {/* PDF warning banner (non-blocking - preview available) */}
                {pdfError && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">{pdfError}</p>
                    <button
                      onClick={() => setPdfError(null)}
                      className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500"
                      aria-label="Chiudi avviso"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="relative rounded-xl overflow-hidden">
                  {isPdf && (
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-medium shadow-lg">
                      <FileText className="w-4 h-4" />
                      PDF
                    </div>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element -- User-uploaded data URL */}
                  <img src={photoPreview} alt="Preview" className="w-full rounded-lg" />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                      <div className="text-center text-white">
                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
                        <p className="text-lg font-medium">{isPdf ? 'Carico il PDF...' : 'Analizzo il problema...'}</p>
                      </div>
                    </div>
                  )}
                  {/* PDF page navigation */}
                  {isPdf && pdfTotalPages > 1 && !isUploading && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                      {/* Analyze different page button */}
                      {analyzedPage !== null && currentPage !== analyzedPage && (
                        <button
                          onClick={() => analyzePdfPage(currentPage)}
                          className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-lg flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          Analizza questa pagina
                        </button>
                      )}
                      {/* Page indicator showing which page is analyzed */}
                      {analyzedPage !== null && currentPage !== analyzedPage && (
                        <span className="text-xs text-amber-400 bg-black/60 px-2 py-1 rounded">
                          Analisi attuale: pagina {analyzedPage + 1}
                        </span>
                      )}
                      {/* Navigation controls */}
                      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-black/80 text-white text-sm shadow-lg">
                        <button
                          onClick={() => {
                            const newPage = Math.max(0, currentPage - 1);
                            setCurrentPage(newPage);
                            setPhotoPreview(pdfPages[newPage]);
                          }}
                          disabled={currentPage === 0}
                          className="p-1.5 hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Pagina precedente"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="min-w-[80px] text-center font-medium">
                          Pagina {currentPage + 1} di {pdfTotalPages}
                        </span>
                        <button
                          onClick={() => {
                            const newPage = Math.min(pdfTotalPages - 1, currentPage + 1);
                            setCurrentPage(newPage);
                            setPhotoPreview(pdfPages[newPage]);
                          }}
                          disabled={currentPage === pdfTotalPages - 1}
                          className="p-1.5 hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Pagina successiva"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setPhotoPreview(null);
                      setIsPdf(false);
                      setPdfPages([]);
                      setCurrentPage(0);
                      setPdfTotalPages(0);
                      setPdfError(null);
                      setAnalyzedPage(null);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
                    aria-label="Rimuovi file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
        />

        {/* Main responsive layout: lg = side by side, below = stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left: Upload cards */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scatta foto */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 group overflow-hidden h-full',
                    isUploading && 'opacity-50 pointer-events-none'
                  )}
                  onClick={() => !isUploading && setShowWebcam(true)}
                >
                  <div className="h-28 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Camera className="w-14 h-14 text-white/90 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardContent className="p-5">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                      Scatta una foto
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Fotografa direttamente dal libro o quaderno usando la webcam.
                    </p>
                    <div className="space-y-1.5 text-sm mb-4">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>Ideale per esercizi scritti a mano</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>Timer per posizionare il materiale</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>Riconoscimento testo automatico</span>
                      </div>
                    </div>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={isUploading}>
                      <Camera className="w-4 h-4 mr-2" />
                      Apri fotocamera
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Carica file */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-600 group overflow-hidden h-full',
                    isUploading && 'opacity-50 pointer-events-none'
                  )}
                  onClick={() => {
                    if (isUploading) return;
                    const input = document.getElementById('file-input') as HTMLInputElement;
                    if (input) {
                      input.value = '';
                      input.click();
                    }
                  }}
                >
                  <div className="h-28 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Upload className="w-14 h-14 text-white/90 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardContent className="p-5">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                      Carica un file
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      Seleziona un&apos;immagine o un documento PDF dal dispositivo.
                    </p>
                    <div className="space-y-1.5 text-sm mb-4">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>Supporta JPG, PNG e PDF multipagina</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>Perfetto per schede e verifiche</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>Navigazione pagine per PDF</span>
                      </div>
                    </div>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isUploading}>
                      <Upload className="w-4 h-4 mr-2" />
                      Sfoglia file
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Right: How it works - Single cohesive card (50% on lg, full width below) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="h-full"
          >
            <Card className="h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 border-slate-200 dark:border-slate-700">
              <CardContent className="p-6 h-full flex flex-col">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Come funziona il metodo maieutico
                </h2>
                {/* On lg: vertical stack. Below lg: horizontal on md */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-5 flex-1">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                      1
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-white">Analisi intelligente</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        L&apos;AI identifica la materia e i concetti chiave per la soluzione.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                      2
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-white">Guida passo-passo</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Passaggi logici che ti guidano senza rivelare la risposta.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                      3
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-white">Suggerimenti progressivi</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Se ti blocchi, chiedi hint sempre più specifici.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tips section - Full width below the main grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-2 text-sm">
                <Lightbulb className="w-4 h-4" />
                Consigli per risultati migliori
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-amber-800 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Testo leggibile</span>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Inquadra tutto</span>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Evita ombre</span>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Un problema alla volta</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Webcam capture modal */}
        <AnimatePresence>
          {showWebcam && (
            <WebcamCapture
              purpose="Fotografa il compito"
              instructions="Posiziona l'esercizio nell'inquadratura. Usa il timer per avere tempo di sistemare il libro."
              onCapture={handleWebcamCapture}
              onClose={() => setShowWebcam(false)}
              showTimer={true}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Steps view (homework loaded)
  const completedSteps = homework.steps.filter(s => s.completed).length;
  const progress = (completedSteps / homework.steps.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="mb-1">{homework.title}</CardTitle>
              <p className="text-sm text-slate-500">{homework.problemType}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-accent-themed">
                {completedSteps}/{homework.steps.length}
              </span>
              <p className="text-xs text-slate-500">passaggi completati</p>
            </div>
          </div>
          <div className="mt-4 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent-themed"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Original problem photo */}
      {homework.photoUrl && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
              <ImageIcon className="w-4 h-4" />
              <span>Problema originale</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- User-uploaded data URL */}
            <img
              src={homework.photoUrl}
              alt="Problema"
              className="w-full rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="space-y-3">
        {homework.steps.map((step, index) => (
          <StepCard
            key={step.id}
            step={step}
            index={index}
            isExpanded={expandedStep === step.id}
            hintsShown={showHints[step.id] || 0}
            onToggle={() => setExpandedStep(
              expandedStep === step.id ? null : step.id
            )}
            onShowHint={() => handleShowNextHint(step.id, step.hints.length)}
            onComplete={() => onCompleteStep(step.id)}
          />
        ))}
      </div>

      {/* Ask question */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
            <MessageCircle className="w-4 h-4" />
            <span>Hai bisogno di aiuto?</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
              placeholder="Fai una domanda..."
              className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={handleAskQuestion} disabled={!question.trim()}>
              Chiedi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual step card
interface StepCardProps {
  step: HomeworkStep;
  index: number;
  isExpanded: boolean;
  hintsShown: number;
  onToggle: () => void;
  onShowHint: () => void;
  onComplete: () => void;
}

function StepCard({
  step,
  index,
  isExpanded,
  hintsShown,
  onToggle,
  onShowHint,
  onComplete,
}: StepCardProps) {
  return (
    <Card className={cn(
      'transition-all',
      step.completed && 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 text-left"
        >
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
            step.completed
              ? 'bg-green-500 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          )}>
            {step.completed ? <CheckCircle className="w-4 h-4" /> : index + 1}
          </div>
          <span className={cn(
            'flex-1 font-medium',
            step.completed && 'text-green-700 dark:text-green-400'
          )}>
            {step.description}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && !step.completed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                {/* Hints */}
                {hintsShown > 0 && (
                  <div className="space-y-2 mb-4">
                    {step.hints.slice(0, hintsShown).map((hint, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                      >
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5" />
                          <p className="text-sm text-amber-800 dark:text-amber-200">{hint}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  {hintsShown < step.hints.length ? (
                    <Button variant="ghost" size="sm" onClick={onShowHint}>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Suggerimento ({hintsShown + 1}/{step.hints.length})
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Tutti i suggerimenti mostrati
                    </span>
                  )}
                  <Button size="sm" onClick={onComplete}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Fatto
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
