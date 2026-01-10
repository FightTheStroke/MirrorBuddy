'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  maestroName: string;
  studentName: string;
  onConsent: () => void;
  onCancel: () => void;
}

/**
 * Consent modal for parent-professor chat
 * Shows disclaimer about AI assistants and privacy notice
 */
export function ConsentModal({
  isOpen,
  maestroName,
  studentName,
  onConsent,
  onCancel,
}: ConsentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" />
            Conversazione con {maestroName}
          </DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-4">
            <p>
              Sta per iniziare una conversazione con il Professore {maestroName}
              riguardo al percorso di apprendimento di {studentName}.
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Disclaimer importante
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    I Professori sono assistenti AI che forniscono osservazioni pedagogiche.
                    Le loro valutazioni non sostituiscono pareri medici, psicologici o
                    diagnosi professionali. Per questioni cliniche, consultare specialisti qualificati.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">In questa conversazione:</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  I messaggi vengono salvati in modo sicuro
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Il Professore utilizza un linguaggio formale
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Le osservazioni si basano sulle sessioni di studio
                </li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel}>
            Annulla
          </Button>
          <Button onClick={onConsent} className="bg-indigo-600 hover:bg-indigo-700">
            Ho capito, continua
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
