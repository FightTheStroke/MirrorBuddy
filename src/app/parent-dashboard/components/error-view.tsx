/**
 * @file error-view.tsx
 * @brief Error view component
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorViewProps {
  error: string | null;
}

export function ErrorView({ error }: ErrorViewProps) {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <div>
            <h3 className="font-semibold text-lg">Errore</h3>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {error}
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Riprova
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

