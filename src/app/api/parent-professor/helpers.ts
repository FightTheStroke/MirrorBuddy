/**
 * Parent-professor conversation helpers
 */

import { prisma } from '@/lib/db';

/**
 * Get or create parent conversation with learnings
 */
export async function getOrCreateParentConversation(
  conversationId: string | undefined,
  userId: string,
  maestroId: string,
  maestroDisplayName: string,
  studentId: string,
  _studentName: string
) {
  if (conversationId) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isParentMode: true,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!conversation) {
      return { success: false, conversation: null, isNew: false };
    }

    const messages = conversation.messages.map(
      (m: (typeof conversation.messages)[number]) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }),
    );

    return { success: true, conversation, messages, isNew: false };
  }

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      maestroId,
      title: `Conversazione con ${maestroDisplayName} (Genitore)`,
      isParentMode: true,
      studentId,
    },
  });

  return { success: true, conversation, isNew: true };
}

/**
 * Add message to conversation
 */
export async function addConversationMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
) {
  return await prisma.message.create({
    data: {
      conversationId,
      role,
      content,
    },
  });
}

/**
 * Update conversation metadata
 */
export async function updateConversationMetadata(conversationId: string, messageIncrement: number = 2) {
  return await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      messageCount: { increment: messageIncrement },
      lastMessageAt: new Date(),
    },
  });
}

/**
 * Get parent learnings for student
 */
export async function getStudentLearnings(studentId: string, maestroId: string) {
  return await prisma.learning.findMany({
    where: {
      userId: studentId,
      ...(maestroId !== 'all' && { maestroId }),
    },
    orderBy: { confidence: 'desc' },
    take: 50,
  });
}

/**
 * Format conversation for response
 */
export function formatConversationResponse(conversation: {
  id: string;
  maestroId: string;
  studentId: string | null;
  title: string | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{ content: string; createdAt: Date }>;
}) {
  return {
    id: conversation.id,
    maestroId: conversation.maestroId,
    studentId: conversation.studentId,
    title: conversation.title || 'Conversazione',
    messageCount: conversation.messageCount,
    lastMessage: conversation.messages[0]?.content?.slice(0, 100),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}
