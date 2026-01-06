/**
 * @file student-consent-banner.tsx
 * @brief Student consent banner component
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, UserCheck } from 'lucide-react';

interface StudentConsentBannerProps {
  onStudentConsent: () => void;
}

export function StudentConsentBanner({
  onStudentConsent,
}: StudentConsentBannerProps) {
  return (
    <div className="max-w-4xl mx-auto mb-6">
      <Card className="border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-800/50">
              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                Consenso dello studente mancante
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Per una maggiore trasparenza, chiedi a tuo/a figlio/a di
                confermare che e d&apos;accordo con la visualizzazione del suo
                profilo di apprendimento. Puoi comunque visualizzare i dati.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300"
              onClick={onStudentConsent}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Studente Acconsente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

