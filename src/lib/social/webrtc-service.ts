/**
 * 📹 WebRTC Service (LiveKit Integration)
 * 
 * Manages study room creation and student connectivity.
 */

import { logger } from "@/lib/logger";

export interface StudyRoomSession {
  roomName: string;
  participantToken: string;
  serverUrl: string;
}

export class WebRTCService {
  /**
   * Request a study room token from the backend
   */
  async joinStudyRoom(roomName: string, identity: string): Promise<StudyRoomSession> {
    logger.info(`Joining study room: ${roomName} as ${identity}`);
    
    // In a real implementation, this would call /api/social/webrtc/token
    const response = await fetch("/api/social/webrtc/token", {
      method: "POST",
      body: JSON.stringify({ roomName, identity }),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error("Failed to get WebRTC token");
    }

    return await response.json();
  }
}

export const webRTC = new WebRTCService();
