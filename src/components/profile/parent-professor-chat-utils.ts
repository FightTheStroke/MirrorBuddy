/**
 * Utility functions for parent-professor chat
 */

import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/auth/csrf-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

/**
 * Initialize chat by checking consent and loading conversation history
 */
export async function initializeChatHistory(
  maestroId: string,
  studentId: string
): Promise<{
  conversationId: string | null;
  messages: Message[];
  hasConsented: boolean;
}> {
  try {
    // Check consent from database
    const consentResponse = await fetch('/api/parent-professor/consent');
    let hasConsented = false;

    if (consentResponse.ok) {
      const consentData = await consentResponse.json();
      hasConsented = consentData.hasConsented;
    }

    // Load existing conversation for this maestro/student
    const response = await fetch(`/api/parent-professor?studentId=${studentId}&limit=20`);
    let conversationId: string | null = null;
    let messages: Message[] = [];

    if (response.ok) {
      const conversations = await response.json();
      // Find conversation with this maestro
      const existing = conversations.find(
        (c: { maestroId: string }) => c.maestroId === maestroId
      );

      if (existing) {
        // Load full conversation with messages
        const convResponse = await fetch(`/api/parent-professor/${existing.id}`);
        if (convResponse.ok) {
          const convData = await convResponse.json();
          conversationId = convData.id;
          messages = convData.messages.map(
            (m: { id: string; role: string; content: string; createdAt: string }) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              createdAt: new Date(m.createdAt),
            })
          );
        }
      }
    }

    return { conversationId, messages, hasConsented };
  } catch (err) {
    logger.error('Failed to initialize chat', { error: String(err) });
    return { conversationId: null, messages: [], hasConsented: false };
  }
}

/**
 * Save consent to database
 */
export async function saveConsent(): Promise<void> {
  try {
    await csrfFetch('/api/parent-professor/consent', { method: 'POST' });
  } catch (err) {
    logger.error('Failed to save consent', { error: String(err) });
  }
}

/**
 * Send message to maestro
 */
export async function sendMessageToMaestro(
  maestroId: string,
  studentId: string,
  studentName: string,
  message: string,
  conversationId: string | null,
  maestroSystemPrompt: string,
  maestroDisplayName: string
): Promise<{
  content: string;
  conversationId: string;
  blocked: boolean;
}> {
  const response = await csrfFetch('/api/parent-professor', {
    method: 'POST',
    body: JSON.stringify({
      maestroId,
      studentId,
      studentName,
      message,
      conversationId,
      maestroSystemPrompt,
      maestroDisplayName,
    }),
  });

  if (!response.ok) {
    throw new Error('Errore nella comunicazione con il server');
  }

  return response.json();
}
