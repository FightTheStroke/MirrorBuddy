/**
 * Chat view component for showcase
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ConversationNode, ConversationOption, Message } from '../types';
import { MessageBubble } from './message-bubble';

interface ChatViewProps {
  conversation: ConversationNode;
  characterName: string;
  characterColor: string;
  characterAvatar: string;
}

export function ChatView({
  conversation,
  characterName,
  characterColor,
  characterAvatar,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(conversation.initialMessages);
  const [currentOptions, setCurrentOptions] = useState<ConversationOption[]>(conversation.options);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleOptionClick = useCallback((option: ConversationOption) => {
    setIsTyping(true);
    setCurrentOptions([]);

    // Add typing indicator
    const typingMessage: Message = { id: 'typing', role: 'assistant', content: '', isTyping: true };

    // Simulate typing delay for each message
    let delay = 0;
    option.nextMessages.forEach((msg) => {
      if (msg.role === 'user') {
        // User messages appear immediately
        setTimeout(() => {
          setMessages(prev => [...prev, msg]);
        }, delay);
        delay += 500;
      } else {
        // Show typing indicator
        setTimeout(() => {
          setMessages(prev => [...prev.filter(m => !m.isTyping), typingMessage]);
        }, delay);
        delay += 1000 + Math.random() * 1000; // Random typing time

        // Then show the message
        setTimeout(() => {
          setMessages(prev => [...prev.filter(m => !m.isTyping), msg]);
        }, delay);
        delay += 300;
      }
    });

    // Show next options after all messages
    setTimeout(() => {
      setIsTyping(false);
      if (option.nextOptions) {
        setCurrentOptions(option.nextOptions);
      }
    }, delay + 500);
  }, []);

  const handleReset = useCallback(() => {
    setMessages(conversation.initialMessages);
    setCurrentOptions(conversation.options);
    setIsTyping(false);
  }, [conversation]);

  return (
    <div className="flex flex-col h-[500px]">
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/30"
          >
            <Image
              src={characterAvatar}
              alt={characterName}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div>
            <h3 className="font-semibold text-white">{characterName}</h3>
            <span className="text-xs text-green-400">Online</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="text-white/60 hover:text-white"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} characterColor={characterColor} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Options area */}
      <div className="p-4 border-t border-white/10">
        {currentOptions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-white/40 mb-2">Scegli una risposta:</p>
            {currentOptions.map(option => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                disabled={isTyping}
                className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white transition-colors flex items-center justify-between group disabled:opacity-50"
              >
                {option.text}
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        ) : !isTyping ? (
          <div className="text-center py-4">
            <p className="text-white/40 text-sm mb-3">Fine della conversazione demo</p>
            <Button
              onClick={handleReset}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Ricomincia
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-white/40 text-sm">Sta scrivendo...</p>
          </div>
        )}
      </div>
    </div>
  );
}
