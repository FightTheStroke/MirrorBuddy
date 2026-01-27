'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('profile.parentChat');
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" />
            {t('title', { maestroName })}
          </DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-4">
            <p>
              {t('description', { maestroName, studentName })}
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {t('disclaimerTitle')}
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    {t('disclaimerText')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">{t('conversationTitle')}</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {t('messagesSaved')}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {t('formalLanguage')}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {t('observationsStudySessions')}
                </li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button onClick={onConsent} className="bg-indigo-600 hover:bg-indigo-700">
            {t('understood')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
