/**
 * Conversation loading and initialization logic
 */

import { logger } from "@/lib/logger";
import type { Message } from "./types";
import type { CharacterInfo } from "../../utils/character-utils";

// Patterns that indicate a greeting message (shown in header now)
// Multilingual patterns for IT, EN, ES, FR, DE
const GREETING_PATTERNS = [
  // Italian
  /^Ehi! Sono \w+/,
  /^Ciao! Sono \w+/,
  /^Ciao! Mi chiamo \w+/,
  // English
  /^Hi! I'm \w+/,
  /^Hello! I'm \w+/,
  // Spanish
  /^¡Hola! Soy \w+/,
  // French
  /^Bonjour! Je suis \w+/,
  /^Salut! Je suis \w+/,
  // German
  /^Hallo! Ich bin \w+/,
  /^Guten Tag! Ich bin \w+/,
];

function isGreetingMessage(
  content: string,
  role: string,
  isFirst: boolean,
): boolean {
  if (role !== "assistant" || !isFirst) return false;
  return GREETING_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Load messages from server for existing conversation
 */
export async function loadMessagesFromServer(
  conversationId: string,
): Promise<Message[] | null> {
  try {
    const response = await fetch(`/api/conversations/${conversationId}`);
    if (response.ok) {
      const convData = await response.json();
      if (convData.messages && convData.messages.length > 0) {
        // Filter out greeting messages - greeting is now shown in header only
        const msgs = convData.messages as Array<{
          id: string;
          role: string;
          content: string;
          createdAt: string;
        }>;
        return msgs
          .filter((m, idx) => !isGreetingMessage(m.content, m.role, idx === 0))
          .map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.createdAt),
          }));
      }
    }
  } catch (error) {
    logger.warn("Failed to load messages from server", {
      error: String(error),
    });
  }
  return null;
}

/**
 * Convert store messages to local format
 */
export function convertStoreMessages(
  storeMessages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp?: number | string | Date;
  }>,
): Message[] {
  // Filter out greeting messages - greeting is now shown in header only
  return storeMessages
    .filter(
      (m, idx) =>
        m.id !== "greeting" && !isGreetingMessage(m.content, m.role, idx === 0),
    )
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      timestamp:
        m.timestamp instanceof Date
          ? m.timestamp
          : new Date(m.timestamp || Date.now()),
    }));
}

/**
 * Create greeting message from character
 */
export function createGreetingMessage(character: CharacterInfo): Message {
  return {
    id: "greeting",
    role: "assistant",
    content: character.greeting,
    timestamp: new Date(),
  };
}

/**
 * Fetch contextual greeting from API
 * Returns contextual greeting if previous conversation exists, otherwise null
 */
export async function fetchContextualGreeting(
  characterId: string,
  studentName: string,
  maestroName: string,
): Promise<{ greeting: string; hasContext: boolean } | null> {
  try {
    const params = new URLSearchParams({
      characterId,
      studentName: studentName || "studente",
      maestroName,
    });
    const response = await fetch(`/api/conversations/greeting?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.greeting) {
      return { greeting: data.greeting, hasContext: data.hasContext };
    }
    return null;
  } catch (error) {
    logger.warn("Failed to fetch contextual greeting", {
      error: String(error),
    });
    return null;
  }
}
