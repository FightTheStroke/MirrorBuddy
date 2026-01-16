'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMaestroById } from '@/data/maestri';
import { ConsentModal } from './parent-professor-chat-consent';
import { ChatMessages } from './parent-professor-chat-messages';
import { ChatInput } from './parent-professor-chat-input';
import {
  initializeChatHistory,
  saveConsent,
  sendMessageToMaestro,
} from './parent-professor-chat-utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface ParentProfessorChatProps {
  maestroId: string;
  maestroName: string;
  studentId: string;
  studentName: string;
  onClose: () => void;
}

/**
 * ParentProfessorChat - Chat interface for parents to talk with Maestri
 *
 * Features:
 * - Consent modal before first message
 * - All messages saved to database
 * - Parent mode prompts for Maestri
 * - Formal communication style
 */
export function ParentProfessorChat({
  maestroId,
  maestroName,
  studentId,
  studentName,
  onClose,
}: ParentProfessorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(true);
  const [hasConsented, setHasConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const maestro = getMaestroById(maestroId);

  // Check for existing consent and load conversation history
  useEffect(() => {
    const loadChat = async () => {
      setIsLoadingHistory(true);
      try {
        const result = await initializeChatHistory(maestroId, studentId);
        setConversationId(result.conversationId);
        setMessages(result.messages);
        if (result.hasConsented) {
          setShowConsentModal(false);
          setHasConsented(true);
        }
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChat();
  }, [maestroId, studentId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when consent is given
  useEffect(() => {
    if (hasConsented && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasConsented]);

  // C-19 FIX: Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleConsent = useCallback(async () => {
    setShowConsentModal(false);
    setHasConsented(true);
    await saveConsent();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !hasConsented) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const data = await sendMessageToMaestro(
        maestroId,
        studentId,
        studentName,
        userMessage.content,
        conversationId,
        maestro?.systemPrompt || '',
        maestroName
      );

      if (data.blocked) {
        setError(data.content);
        return;
      }

      // Save conversation ID for subsequent messages
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.content,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Si e verificato un errore');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <ConsentModal
        isOpen={showConsentModal}
        maestroName={maestroName}
        studentName={studentName}
        onConsent={handleConsent}
        onCancel={onClose}
      />

      {hasConsented && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <Card className="w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <CardHeader className="flex-shrink-0 border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
                    <Image
                      src={maestro?.avatar || `/maestri/${maestroId}.webp`}
                      alt={maestroName}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{maestroName}</CardTitle>
                    <p className="text-sm text-slate-500">
                      Conversazione su {studentName}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>

            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              isLoadingHistory={isLoadingHistory}
              error={error}
              maestro={maestro ?? null}
              maestroId={maestroId}
              maestroName={maestroName}
              studentName={studentName}
              messagesEndRef={messagesEndRef}
            />

            <ChatInput
              value={inputValue}
              isLoading={isLoading}
              onChange={setInputValue}
              onSend={handleSendMessage}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
            />
          </Card>
        </motion.div>
      )}
    </>
  );
}

export default ParentProfessorChat;
