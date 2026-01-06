/**
 * @file deletion-pending-view.tsx
 * @brief Deletion pending view component
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Trash2 } from 'lucide-react';

export function DeletionPendingView() {
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <Trash2 className="h-5 w-5" />
          Cancellazione Richiesta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600 dark:text-slate-400">
          La richiesta di cancellazione e stata registrata. I dati verranno
          eliminati entro 30 giorni, come previsto dal GDPR.
        </p>
      </CardContent>
    </Card>
  );
}

