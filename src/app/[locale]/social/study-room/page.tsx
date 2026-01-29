"use client";

/**
 * 🤝 Social Study Room
 * Collaborative environment with WebRTC and AI Co-Pilot.
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Video, Mic, Share2, MessageSquare, Bot } from "lucide-react";
import { aiCopilot } from "@/lib/social/ai-copilot";

export default function StudyRoomPage() {
  const [participants, setParticipants] = useState(["You", "Alex (ADHD Student)"]);
  const [isLive, setIsLive] = useState(false);
  const [lastIntervention, setLastIntervention] = useState<string | null>(null);

  // Simulate AI Moderator checking the session
  useEffect(() => {
    if (isLive) {
      const interval = setInterval(async () => {
        // In a real app, we would pass the actual transcript from WebRTC
        const intervention = await aiCopilot.checkIntervention({
          transcript: [
            { user: "Alex", text: "Wait, what was the next step for this triangle?" },
            { user: "You", text: "I'm not sure, maybe we use the Pythagorean theorem?" }
          ],
          topic: "Geometry",
          isStuck: true
        });
        
        if (intervention) setLastIntervention(intervention);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Group Study: Geometry</h1>
            <p className="text-sm text-slate-500">{participants.length} Participants</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isLive ? (
            <Button onClick={() => setIsLive(true)} className="bg-green-600 hover:bg-green-700">
              <Video className="w-4 h-4 mr-2" /> Start Session
            </Button>
          ) : (
            <Badge className="bg-red-500 text-white px-4 py-1 animate-pulse">LIVE</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Video Grid Area */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4 h-96">
            <div className="bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-slate-700">
              <span className="text-white font-medium">Local Camera</span>
            </div>
            <div className="bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-slate-700">
              <span className="text-white font-medium">Alex (Remote)</span>
            </div>
          </div>
          
          {/* AI INTERVENTION BOX */}
          {lastIntervention && (
            <Card className="bg-indigo-50 border-indigo-200 animate-in slide-in-from-bottom">
              <CardContent className="p-4 flex items-start gap-3">
                <Bot className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-indigo-900">AI Co-Pilot Suggestion</p>
                  <p className="text-sm text-indigo-800 mt-1 italic">"{lastIntervention}"</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Collaborative Tools */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Study Tools</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start"><Share2 className="w-4 h-4 mr-2" /> Share Mind Map</Button>
              <Button variant="outline" className="w-full justify-start"><MessageSquare className="w-4 h-4 mr-2" /> Chat History</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
