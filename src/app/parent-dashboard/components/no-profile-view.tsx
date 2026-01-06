/**
 * @file no-profile-view.tsx
 * @brief No profile view component
 */

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { UserCheck, RefreshCw, Loader2 } from 'lucide-react';

interface NoProfileViewProps {
  onGenerate: () => void;
  isGenerating: boolean;
  error: string | null;
}

export function NoProfileView({
  onGenerate,
  isGenerating,
  error,
}: NoProfileViewProps) {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-indigo-500" />
          Nessun Profilo Disponibile
        </CardTitle>
        <CardDescription>
          Per creare il profilo dello studente, e necessario prima interagire
          con i Professori durante le sessioni di studio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Il profilo viene generato automaticamente analizzando le conversazioni
          con i Professori, identificando punti di forza, aree di crescita e
          suggerendo strategie personalizzate.
        </p>
        <div className="flex gap-3">
          <Button onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generazione...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Genera Profilo
              </>
            )}
          </Button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
}

