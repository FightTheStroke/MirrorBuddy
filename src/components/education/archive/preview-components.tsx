/**
 * Content preview sub-components
 * Individual preview renderers for different content types
 */

import { Brain, FileText } from 'lucide-react';

export function MindMapPreview({ content }: { content: unknown }) {
  const data = content as { nodes?: Array<{ id: string; label: string }> };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center">
        <Brain className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">
          Anteprima Mappa Mentale
        </p>
        {data?.nodes && (
          <p className="text-sm text-slate-500 mt-2">
            {data.nodes.length} nodi
          </p>
        )}
      </div>
    </div>
  );
}

export function QuizPreview({ content }: { content: unknown }) {
  const data = content as { questions?: Array<{ question: string; options?: string[] }> };
  const firstQuestion = data?.questions?.[0];

  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-950 rounded-lg p-6 border border-green-200 dark:border-green-800">
        <h3 className="font-semibold text-green-900 dark:text-green-100 mb-4">
          Prima Domanda
        </h3>
        {firstQuestion ? (
          <>
            <p className="text-green-800 dark:text-green-200 mb-4">
              {firstQuestion.question}
            </p>
            {firstQuestion.options && (
              <div className="space-y-2">
                {firstQuestion.options.map((option, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-700"
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-green-700 dark:text-green-300">
            Nessuna domanda disponibile
          </p>
        )}
      </div>
      {data?.questions && data.questions.length > 1 && (
        <p className="text-sm text-slate-500 text-center">
          +{data.questions.length - 1} altre domande
        </p>
      )}
    </div>
  );
}

export function SummaryPreview({ content }: { content: unknown }) {
  const data = content as { summary?: string; text?: string };
  const text = data?.summary || data?.text || '';
  const preview = text.substring(0, 200);

  return (
    <div className="space-y-4">
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          {preview}
          {text.length > 200 && '...'}
        </p>
      </div>
      {text.length > 200 && (
        <p className="text-sm text-slate-500 text-center">
          Mostra tutto ({Math.ceil(text.length / 100)} parole circa)
        </p>
      )}
    </div>
  );
}

export function FlashcardPreview({ content }: { content: unknown }) {
  const data = content as { cards?: Array<{ front: string; back: string }> };
  const firstCard = data?.cards?.[0];

  return (
    <div className="space-y-4">
      {firstCard ? (
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-xl p-8 border-2 border-orange-200 dark:border-orange-800 shadow-lg">
            <div className="text-center mb-6">
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                FRONTE
              </span>
            </div>
            <p className="text-lg font-semibold text-orange-900 dark:text-orange-100 text-center">
              {firstCard.front}
            </p>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">
              Tocca per vedere il retro
            </p>
          </div>
        </div>
      ) : (
        <p className="text-slate-600 dark:text-slate-400 text-center">
          Nessuna flashcard disponibile
        </p>
      )}
      {data?.cards && data.cards.length > 1 && (
        <p className="text-sm text-slate-500 text-center">
          +{data.cards.length - 1} altre flashcard
        </p>
      )}
    </div>
  );
}

export function GenericPreview({ content }: { content: unknown }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center">
      <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
      <p className="text-slate-600 dark:text-slate-400">
        Anteprima non disponibile per questo tipo di contenuto
      </p>
      <pre className="mt-4 text-xs text-left overflow-auto bg-slate-100 dark:bg-slate-900 p-4 rounded">
        {JSON.stringify(content, null, 2)}
      </pre>
    </div>
  );
}
