import { motion } from 'framer-motion';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MaieuticChatPanelProps {
  chat: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>;
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}

export function MaieuticChatPanel({
  chat,
  input,
  isLoading,
  onInputChange,
  onSubmit,
}: MaieuticChatPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          Dialogo Maieutico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
          {chat.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500">
                Hai dubbi? Chiedimi aiuto!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ti guiderò con domande
              </p>
            </div>
          ) : (
            chat.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-3 rounded-lg text-sm',
                  msg.role === 'user'
                    ? 'bg-accent-themed text-white ml-8'
                    : 'bg-slate-100 dark:bg-slate-800 mr-8'
                )}
              >
                {msg.content}
              </motion.div>
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              Sto pensando...
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            placeholder="Fai una domanda..."
            className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

