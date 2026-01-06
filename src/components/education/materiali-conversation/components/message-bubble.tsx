/**
 * @file message-bubble.tsx
 * @brief Message bubble component
 */

import Image from 'next/image';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolResultDisplay } from '@/components/tools';
import type { ConversationMessage, Character } from '../types';

interface MessageBubbleProps {
  message: ConversationMessage;
  character: Character;
  highContrast: boolean;
  dyslexiaFont: boolean;
  lineSpacing: string;
}

export function MessageBubble({
  message,
  character,
  highContrast,
  dyslexiaFont,
  lineSpacing,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex gap-3',
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.role === 'assistant' && (
        <div
          className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
          style={{ boxShadow: `0 0 0 2px ${character.color}` }}
        >
          <Image
            src={character.avatar}
            alt={character.name}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-2 max-w-[80%]">
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <div
                key={att.id}
                className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700"
              >
                {att.type === 'image' ? (
                  <Image
                    src={att.url}
                    alt={att.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                    <FileText className="w-6 h-6 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {message.content && (
          <div
            className={cn(
              'rounded-2xl px-4 py-3',
              message.role === 'user'
                ? highContrast
                  ? 'bg-yellow-400 text-black'
                  : 'bg-accent-themed text-white'
                : highContrast
                  ? 'bg-gray-900 text-white border border-gray-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white',
              dyslexiaFont && 'tracking-wide'
            )}
            style={{ lineHeight: lineSpacing }}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2">
            {message.toolCalls.map((toolCall) => (
              <ToolResultDisplay key={toolCall.id} toolCall={toolCall} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

