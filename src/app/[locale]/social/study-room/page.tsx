"use client";

/**
 * 🤝 Social Study Room (LIVEKIT REAL CONNECTION)
 */

import { useState, useEffect } from "react";
import { 
  LiveKitRoom, 
  VideoConference, 
  RoomAudioRenderer,
  ControlBar,
  useTracks
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Users, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { aiCopilot } from "@/lib/social/ai-copilot";

export default function StudyRoomPage() {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>("general-study");
  const [lastIntervention, setLastIntervention] = useState<string | null>(null);

  const handleJoin = async () => {
    const identity = `student-${Math.floor(Math.random() * 1000)}`;
    try {
      const response = await fetch("/api/social/webrtc/token", {
        method: "POST",
        body: JSON.stringify({ roomName, identity }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      setToken(data.participantToken);
      setServerUrl(data.serverUrl);
    } catch (err) {
      console.error("Failed to join room", err);
    }
  };

  if (!token || !serverUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Users className="w-16 h-16 text-blue-600" />
        <h1 className="text-2xl font-bold">Social Study Room</h1>
        <p className="text-slate-500">Collaborate with other students in real-time.</p>
        <Button onClick={handleJoin} className="bg-blue-600">Join Study Session</Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        data-lk-theme="default"
        style={{ height: '100dvh' }}
      >
        {/* TOP BAR */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
          <Badge className="bg-red-600 pointer-events-auto">LIVE: {roomName}</Badge>
          
          {/* AI MODERATOR OVERLAY */}
          {lastIntervention && (
            <Card className="bg-indigo-900/80 border-indigo-500 text-white w-96 pointer-events-auto">
              <CardContent className="p-3 flex items-start gap-2">
                <Bot className="w-5 h-5 text-indigo-400" />
                <p className="text-xs italic">"{lastIntervention}"</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* MAIN VIDEO GRID */}
        <VideoConference />
        
        {/* TOOLS */}
        <RoomAudioRenderer />
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <ControlBar />
        </div>
      </LiveKitRoom>
    </div>
  );
}
