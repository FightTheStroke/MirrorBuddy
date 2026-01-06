import { DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CostSummary, CostForecast } from '../types';

interface CostsSectionProps {
  costs: CostSummary | null;
  forecast: CostForecast | null;
  loadingCosts: boolean;
  costsConfigured: boolean;
  onShowConfig: () => void;
}

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function CostsSection({
  costs,
  forecast,
  loadingCosts,
  costsConfigured,
  onShowConfig,
}: CostsSectionProps) {
  if (!costsConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Costi Azure OpenAI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <h4 className="font-medium text-amber-700 dark:text-amber-300 mb-2">
              Cost Management non configurato
            </h4>
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
              Per visualizzare i costi Azure, configura un Service Principal con ruolo &quot;Cost Management Reader&quot;:
            </p>
            <button
              onClick={onShowConfig}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Mostra form di configurazione
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadingCosts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Costi Azure OpenAI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!costs) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Costi Azure OpenAI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Impossibile recuperare i dati sui costi Azure. Verifica la connessione o riprova piu tardi.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Costi Azure OpenAI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-600 dark:text-blue-400">Ultimi 30 giorni</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(costs.totalCost, costs.currency)}
            </p>
          </div>
          {forecast && (
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-600 dark:text-green-400">Stima fine mese</span>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(forecast.estimatedTotal, forecast.currency)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

