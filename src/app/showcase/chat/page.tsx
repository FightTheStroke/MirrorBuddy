/**
 * Showcase Chat Page
 * Demo page showing conversation examples with Coach and Buddy
 */

'use client';

import { useState } from 'react';
import { MessageCircle, Sparkles, Brain, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MELISSA_CONVERSATION, MARIO_CONVERSATION } from './conversations';
import { ChatView } from './components/chat-view';

export default function ShowcaseChatPage() {
  const [activeTab, setActiveTab] = useState('coach');

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-pink-400" />
          </div>
          Chat Simulata
        </h1>
        <p className="text-white/60 mt-1">Prova una conversazione con i nostri Coach e Buddy</p>
      </div>

      {/* Info card */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 mb-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white/80">
                Questa e una <strong>demo pre-scritta</strong> per mostrarti come funzionano le conversazioni.
                In modalita completa, le risposte sarebbero generate dall AI e personalizzate per te!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-white/10 p-1 rounded-xl mb-4">
          <TabsTrigger
            value="coach"
            className="flex-1 data-[state=active]:bg-amber-500 data-[state=active]:text-white rounded-lg"
          >
            <Brain className="w-4 h-4 mr-2" />
            Coach Melissa
          </TabsTrigger>
          <TabsTrigger
            value="buddy"
            className="flex-1 data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg"
          >
            <Heart className="w-4 h-4 mr-2" />
            Buddy Mario
          </TabsTrigger>
        </TabsList>

        <Card className="bg-white/5 border-white/10 overflow-hidden">
          <TabsContent value="coach" className="m-0">
            <ChatView
              conversation={MELISSA_CONVERSATION}
              characterName="Coach Melissa"
              characterColor="#F59E0B"
              characterAvatar="/avatars/melissa.jpg"
            />
          </TabsContent>

          <TabsContent value="buddy" className="m-0">
            <ChatView
              conversation={MARIO_CONVERSATION}
              characterName="Buddy Mario"
              characterColor="#22C55E"
              characterAvatar="/avatars/mario.jpg"
            />
          </TabsContent>
        </Card>
      </Tabs>

      {/* Character descriptions */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4">
            <h3 className="font-semibold text-amber-400 mb-1">Coach Melissa</h3>
            <p className="text-xs text-white/60">
              Esperta di metodi di studio. Ti aiuta con organizzazione, concentrazione e gestione dello stress.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4">
            <h3 className="font-semibold text-green-400 mb-1">Buddy Mario</h3>
            <p className="text-xs text-white/60">
              Un compagno che capisce le tue sfide. Condivide esperienze e ti supporta emotivamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
