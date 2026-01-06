/**
 * @file consent-form.tsx
 * @brief Consent form component for parent dashboard
 */

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Shield, BookOpen, User, UserCheck } from 'lucide-react';

interface ConsentFormProps {
  onConsent: () => void;
}

export function ConsentForm({ onConsent }: ConsentFormProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4 border border-indigo-200 dark:border-indigo-800">
          <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <CardTitle className="text-xl sm:text-2xl">
          Consenso per il Dashboard Genitori
        </CardTitle>
        <CardDescription className="text-sm sm:text-base mt-2">
          Per visualizzare le osservazioni dei Professori su tuo/a figlio/a,
          abbiamo bisogno del tuo consenso esplicito.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800">
          <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Perche raccogliamo questi dati?
          </h4>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Durante le conversazioni con i Professori virtuali, il sistema
            osserva come tuo/a figlio/a apprende e interagisce. Queste
            osservazioni ci permettono di costruire un profilo educativo che ti
            aiuta a{' '}
            <strong>
              supportare meglio il suo percorso di apprendimento a casa
            </strong>
            .
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            Cosa potrai vedere:
          </h4>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              'Punti di forza osservati dai Professori',
              'Aree dove puo crescere con supporto',
              'Strategie personalizzate per studiare a casa',
              'Stile di apprendimento preferito',
              'Diario con osservazioni cronologiche',
              'Suggerimenti pratici per ogni materia',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 border border-amber-100 dark:border-amber-800">
          <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Come ti aiuta questo strumento:
          </h4>
          <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
            {[
              "Capisci meglio come tuo/a figlio/a affronta lo studio",
              "Ricevi suggerimenti concreti su come supportarlo/a a casa",
              "Segui i progressi nel tempo con osservazioni datate",
              "Scopri i suoi punti di forza per valorizzarli",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="font-bold">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy e i tuoi diritti (GDPR):
          </h4>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-blue-700 dark:text-blue-300">
            {[
              'Dati trattati in conformita al GDPR',
              'Esporta i dati in qualsiasi momento',
              'Richiedi la cancellazione quando vuoi',
              'Nessuna condivisione con terze parti',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">
                  {['🔒', '💾', '🗑️', '🚫'][i]}
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong className="text-slate-700 dark:text-slate-300">
              Nota importante:
            </strong>{' '}
            Tutte le osservazioni e i suggerimenti sono generati da un sistema
            di Intelligenza Artificiale. L&apos;AI puo commettere errori e le
            osservazioni non sostituiscono la valutazione di insegnanti o
            professionisti qualificati. Usa queste informazioni come spunto di
            riflessione, non come diagnosi o valutazione definitiva.
          </p>
        </div>

        <div className="pt-2">
          <Button
            onClick={onConsent}
            className="w-full py-5 sm:py-6 text-base sm:text-lg bg-accent-themed hover:bg-accent-themed/90 shadow-lg"
          >
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Acconsento alla Visualizzazione del Profilo
          </Button>
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-3">
            Cliccando, confermi di essere il genitore/tutore legale e di
            acconsentire al trattamento dei dati educativi.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

