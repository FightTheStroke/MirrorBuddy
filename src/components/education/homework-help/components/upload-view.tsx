/**
 * @file upload-view.tsx
 * @brief Upload view component
 */

import { motion } from 'framer-motion';
import {
  BookOpen,
  AlertTriangle,
  X,
  Sparkles,
  Target,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { WebcamCapture } from '@/components/tools/webcam-capture';
import { AnimatePresence } from 'framer-motion';
import { PdfViewer } from './pdf-viewer';
import { UploadCards } from './upload-cards';

interface UploadViewProps {
  pdfError: string | null;
  photoPreview: string | null;
  isPdf: boolean;
  pdfPages: string[];
  currentPage: number;
  pdfTotalPages: number;
  isUploading: boolean;
  analyzedPage: number | null;
  showWebcam: boolean;
  onPdfErrorDismiss: () => void;
  onPageChange: (page: number) => void;
  onAnalyzePage: (pageIndex: number) => void;
  onClosePreview: () => void;
  onWebcamClick: () => void;
  onFileClick: () => void;
  onWebcamCapture: (imageData: string) => void;
  onWebcamClose: () => void;
  onGoogleDriveClick?: () => void;
  isGoogleDriveConnected?: boolean;
}

export function UploadView({
  pdfError,
  photoPreview,
  isPdf,
  pdfPages,
  currentPage,
  pdfTotalPages,
  isUploading,
  analyzedPage,
  showWebcam,
  onPdfErrorDismiss,
  onPageChange,
  onAnalyzePage,
  onClosePreview,
  onWebcamClick,
  onFileClick,
  onWebcamCapture,
  onWebcamClose,
  onGoogleDriveClick,
  isGoogleDriveConnected,
}: UploadViewProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
          Carica i tuoi esercizi e riceverai una guida personalizzata
          passo-passo con il metodo maieutico.
        </p>
      </div>

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
                  onClick={onPdfErrorDismiss}
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

      {photoPreview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PdfViewer
            photoPreview={photoPreview}
            isPdf={isPdf}
            pdfPages={pdfPages}
            currentPage={currentPage}
            pdfTotalPages={pdfTotalPages}
            pdfError={pdfError}
            isUploading={isUploading}
            analyzedPage={analyzedPage}
            onPageChange={onPageChange}
            onAnalyzePage={onAnalyzePage}
            onClose={onClosePreview}
            onPdfErrorDismiss={onPdfErrorDismiss}
          />
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div>
          <UploadCards
            isUploading={isUploading}
            onWebcamClick={onWebcamClick}
            onFileClick={onFileClick}
            onGoogleDriveClick={onGoogleDriveClick}
            isGoogleDriveConnected={isGoogleDriveConnected}
          />
        </div>

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
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-5 flex-1">
                {[
                  {
                    num: 1,
                    title: 'Analisi intelligente',
                    desc: "L'AI identifica la materia e i concetti chiave per la soluzione.",
                    color: 'blue',
                  },
                  {
                    num: 2,
                    title: 'Guida passo-passo',
                    desc: 'Passaggi logici che ti guidano senza rivelare la risposta.',
                    color: 'indigo',
                  },
                  {
                    num: 3,
                    title: 'Suggerimenti progressivi',
                    desc: 'Se ti blocchi, chiedi hint sempre più specifici.',
                    color: 'emerald',
                  },
                ].map((item) => (
                  <div
                    key={item.num}
                    className={`flex items-start gap-4 p-4 rounded-xl bg-${item.color}-50 dark:bg-${item.color}-950/30 border border-${item.color}-100 dark:border-${item.color}-900`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full bg-${item.color}-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md`}
                    >
                      {item.num}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
              {[
                'Testo leggibile',
                'Inquadra tutto',
                'Evita ombre',
                'Un problema alla volta',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {showWebcam && (
          <WebcamCapture
            purpose="Fotografa il compito"
            instructions="Posiziona l'esercizio nell'inquadratura. Usa il timer per avere tempo di sistemare il libro."
            onCapture={onWebcamCapture}
            onClose={onWebcamClose}
            showTimer={true}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

