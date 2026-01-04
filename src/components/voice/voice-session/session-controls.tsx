'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, PhoneOff, VolumeX, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SessionControlsProps {
  isMuted: boolean;
  isSpeaking: boolean;
  onToggleMute: () => void;
  onCancelResponse: () => void;
  onSendText: (text: string) => void;
  onSwitchToChat?: () => void;
  onClose: () => void;
}

export function SessionControls({
  isMuted,
  isSpeaking,
  onToggleMute,
  onCancelResponse,
  onSendText,
  onSwitchToChat,
  onClose,
}: SessionControlsProps) {
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onSendText(textInput);
      setTextInput('');
    }
  };

  return (
    <div className="p-6 border-t border-slate-700/50 bg-slate-800/30">
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={onToggleMute}
          title={isMuted ? 'Riattiva microfono' : 'Silenzia microfono'}
          aria-label={isMuted ? 'Riattiva microfono' : 'Silenzia microfono'}
          className={cn(
            'rounded-full transition-colors',
            isMuted
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-slate-700 text-white hover:bg-slate-600'
          )}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        {isSpeaking && (
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={onCancelResponse}
            title="Interrompi risposta"
            aria-label="Interrompi risposta"
            className="rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
          >
            <VolumeX className="h-6 w-6" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon-lg"
          onClick={() => setShowTextInput(!showTextInput)}
          title="Scrivi un messaggio"
          aria-label="Scrivi un messaggio"
          className="rounded-full bg-slate-700 text-white hover:bg-slate-600"
        >
          <Send className="h-5 w-5" />
        </Button>

        {onSwitchToChat && (
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={onSwitchToChat}
            title="Passa alla chat testuale"
            aria-label="Passa alla chat testuale"
            className="rounded-full bg-green-600/20 text-green-400 hover:bg-green-600/30"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        )}

        <Button
          variant="destructive"
          size="icon-lg"
          onClick={onClose}
          title="Termina sessione"
          aria-label="Termina sessione"
          className="rounded-full"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>

      <AnimatePresence>
        {showTextInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                placeholder="Scrivi un messaggio..."
                className="flex-1 px-4 py-2 rounded-xl bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={handleTextSubmit} disabled={!textInput.trim()}>
                Invia
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
