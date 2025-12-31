'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

/**
 * Onboarding Settings Component
 *
 * Provides:
 * - "Rivedi tutorial" button to replay onboarding
 * - "Reset completo" destructive action with multiple confirmations
 */
export function OnboardingSettings() {
  const router = useRouter();
  const { startReplay, resetAllData } = useOnboardingStore();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmStep, setResetConfirmStep] = useState<1 | 2 | 3>(1);
  const [resetInput, setResetInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleReplayTutorial = () => {
    startReplay();
    router.push('/welcome?replay=true');
  };

  const handleResetConfirm = async () => {
    if (resetConfirmStep === 1) {
      setResetConfirmStep(2);
    } else if (resetConfirmStep === 2) {
      if (resetInput.toUpperCase() === 'RESET') {
        setResetConfirmStep(3);
      }
    } else if (resetConfirmStep === 3) {
      setIsResetting(true);
      await resetAllData();
      // resetAllData redirects to /welcome automatically
    }
  };

  const handleResetCancel = () => {
    setShowResetDialog(false);
    setResetConfirmStep(1);
    setResetInput('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-blue-500" />
          Tutorial e Reset
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Replay Tutorial */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-700 dark:text-blue-300">
                Rivedi il tutorial
              </h4>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Guarda di nuovo la presentazione di Melissa e i Maestri.
                I tuoi dati non verranno modificati.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full border-blue-300 text-blue-600 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/30"
            onClick={handleReplayTutorial}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Rivedi Tutorial
          </Button>
        </div>

        {/* Reset Complete */}
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-700 dark:text-red-300">
                Reset completo
              </h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                Elimina TUTTI i tuoi dati e ricomincia da zero.
                Questa azione e irreversibile!
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
            onClick={() => setShowResetDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Reset Completo
          </Button>
        </div>

        {/* Reset Confirmation Dialog */}
        <Dialog open={showResetDialog} onOpenChange={handleResetCancel}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                {resetConfirmStep === 1 && 'Sei sicuro?'}
                {resetConfirmStep === 2 && 'Conferma con RESET'}
                {resetConfirmStep === 3 && 'Ultima conferma'}
              </DialogTitle>
              <DialogDescription>
                {resetConfirmStep === 1 && (
                  <span className="text-red-600">
                    Stai per eliminare TUTTI i tuoi dati:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Progressi e XP</li>
                      <li>Flashcard e materiali salvati</li>
                      <li>Conversazioni con i Maestri</li>
                      <li>Impostazioni e preferenze</li>
                    </ul>
                  </span>
                )}
                {resetConfirmStep === 2 && (
                  <span>
                    Per confermare, scrivi <strong>RESET</strong> nel campo qui sotto.
                  </span>
                )}
                {resetConfirmStep === 3 && (
                  <span className="text-red-600 font-medium">
                    Questo è l&apos;ultimo avviso. Clicca &ldquo;Elimina tutto&rdquo; per procedere.
                    NON potrai tornare indietro!
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {resetConfirmStep === 2 && (
              <div className="py-4">
                <Input
                  value={resetInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResetInput(e.target.value)}
                  placeholder="Scrivi RESET..."
                  className="text-center uppercase"
                  autoFocus
                />
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleResetCancel}>
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={handleResetConfirm}
                disabled={
                  (resetConfirmStep === 2 && resetInput.toUpperCase() !== 'RESET') ||
                  isResetting
                }
              >
                {isResetting ? (
                  'Eliminazione in corso...'
                ) : resetConfirmStep === 3 ? (
                  'Elimina tutto'
                ) : (
                  'Continua'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
