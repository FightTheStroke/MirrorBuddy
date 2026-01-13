/**
 * @file upload-cards.tsx
 * @brief Upload cards component
 * ADR 0038: Google Drive Integration support
 */

import { motion } from 'framer-motion';
import { Camera, Upload, CheckCircle, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UploadCardsProps {
  isUploading: boolean;
  onWebcamClick: () => void;
  onFileClick: () => void;
  onGoogleDriveClick?: () => void;
  isGoogleDriveConnected?: boolean;
}

export function UploadCards({
  isUploading,
  onWebcamClick,
  onFileClick,
  onGoogleDriveClick,
  isGoogleDriveConnected = false,
}: UploadCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          onClick={() => !isUploading && onWebcamClick()}
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
              {[
                'Ideale per esercizi scritti a mano',
                'Timer per posizionare il materiale',
                'Riconoscimento testo automatico',
              ].map((text, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-slate-500 dark:text-slate-400"
                >
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isUploading}
            >
              <Camera className="w-4 h-4 mr-2" />
              Apri fotocamera
            </Button>
          </CardContent>
        </Card>
      </motion.div>

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
          onClick={onFileClick}
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
              {[
                'Supporta JPG, PNG e PDF multipagina',
                'Perfetto per schede e verifiche',
                'Navigazione pagine per PDF',
              ].map((text, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-slate-500 dark:text-slate-400"
                >
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Sfoglia file
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {onGoogleDriveClick && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card
            className={cn(
              'cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-emerald-400 dark:hover:border-emerald-600 group overflow-hidden h-full',
              isUploading && 'opacity-50 pointer-events-none',
              !isGoogleDriveConnected && 'opacity-70'
            )}
            onClick={() => !isUploading && onGoogleDriveClick()}
          >
            <div className="h-28 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Cloud className="w-14 h-14 text-white/90 group-hover:scale-110 transition-transform" />
            </div>
            <CardContent className="p-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Google Drive
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {isGoogleDriveConnected
                  ? 'Seleziona file direttamente dal tuo Google Drive.'
                  : 'Collega Google Drive nelle impostazioni per usare questa opzione.'}
              </p>
              <div className="space-y-1.5 text-sm mb-4">
                {[
                  'Accedi ai tuoi file nel cloud',
                  'Supporta immagini e PDF',
                  'Sincronizzato con il tuo account',
                ].map((text, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-slate-500 dark:text-slate-400"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={isUploading || !isGoogleDriveConnected}
              >
                <Cloud className="w-4 h-4 mr-2" />
                {isGoogleDriveConnected ? 'Apri Drive' : 'Collega nelle impostazioni'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

