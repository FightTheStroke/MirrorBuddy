/**
 * Parent-professor conversation types
 */

export interface ParentChatRequest {
  maestroId: string;
  studentId: string;
  studentName: string;
  message: string;
  conversationId?: string; // Continue existing conversation
  maestroSystemPrompt: string;
  maestroDisplayName: string;
}
