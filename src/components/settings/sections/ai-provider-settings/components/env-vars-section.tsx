import { Cloud, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetailedProviderStatus } from '../types';

interface EnvVarsSectionProps {
  providerStatus: DetailedProviderStatus;
  showEnvDetails: boolean;
  onToggle: () => void;
}

export function EnvVarsSection({
  providerStatus,
  showEnvDetails,
  onToggle,
}: EnvVarsSectionProps) {
  return (
    <>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <span>{showEnvDetails ? '▼' : '▶'}</span>
        <span>Mostra configurazione .env</span>
      </button>

      {showEnvDetails && (
        <div className="space-y-4 pt-2">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-500" />
              Azure OpenAI (Chat + Voice)
            </h5>
            <div className="space-y-2">
              {providerStatus.azure.envVars.map((envVar) => (
                <div key={envVar.name} className="flex items-center justify-between text-xs">
                  <code className="font-mono text-slate-600 dark:text-slate-400">
                    {envVar.name}
                  </code>
                  <div className="flex items-center gap-2">
                    {envVar.configured ? (
                      <>
                        <span className="text-green-600 dark:text-green-400">
                          {envVar.displayValue || '****'}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400">Non configurato</span>
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
              <Server className="w-4 h-4 text-green-500" />
              Ollama (Solo Chat locale)
            </h5>
            <div className="space-y-2">
              {providerStatus.ollama.envVars.map((envVar) => (
                <div key={envVar.name} className="flex items-center justify-between text-xs">
                  <code className="font-mono text-slate-600 dark:text-slate-400">
                    {envVar.name}
                  </code>
                  <div className="flex items-center gap-2">
                    <span className={envVar.configured ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
                      {envVar.displayValue || 'Default'}
                    </span>
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      envVar.configured ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                    )} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 bg-slate-100 dark:bg-slate-700 rounded text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Per usare Ollama, avvialo con:
              </p>
              <code className="block mt-1 text-green-600 dark:text-green-400 font-mono">
                ollama serve && ollama pull llama3.2
              </code>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

