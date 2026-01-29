/**
 * 🤖 AI Co-Pilot Moderator
 * 
 * An invisible mediator for WebRTC study sessions.
 */

import { chatCompletion } from "@/lib/ai/providers";
import { logger } from "@/lib/logger";

export interface GroupSessionState {
  transcript: Array<{ user: string; text: string }>;
  topic: string;
  isStuck: boolean;
}

export class AICopilot {
  private systemPrompt = `You are a Shadow Moderator for a student study group. 
  Your goal is to ensure the session is productive, safe, and pedagogically sound.
  
  RULES:
  1. STAY INVISIBLE until needed.
  2. INTERVENE if the students are stuck for more than 2 minutes.
  3. INTERVENE immediately if you detect bullying, harmful content, or safety violations.
  4. INTERVENE to celebrate milestones or resolve pedagogical deadlocks. 
  
  When you intervene, use a warm, encouraging teacher-like tone.`;

  /**
   * Evaluates if intervention is needed based on the current transcript
   */
  async checkIntervention(state: GroupSessionState): Promise<string | null> {
    const recentHistory = state.transcript.slice(-5);
    if (recentHistory.length < 2) return null;

    const prompt = `Based on this study transcript, should I intervene? 
    If yes, provide the short text I should say. If no, reply ONLY with 'null'.
    
    Transcript:
    ${recentHistory.map(h => `${h.user}: ${h.text}`).join('\n')}`;

    const response = await chatCompletion([], this.systemPrompt + "\n\n" + prompt);
    
    if (response.content.toLowerCase().includes('null')) return null;
    
    logger.info("🤖 AICopilot Intervening in session");
    return response.content;
  }
}

export const aiCopilot = new AICopilot();
