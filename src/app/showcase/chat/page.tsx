'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MessageCircle, Sparkles, RotateCcw, Heart, Brain, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Types
interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  isTyping?: boolean;
}

interface ConversationOption {
  id: string;
  text: string;
  nextMessages: Message[];
  nextOptions?: ConversationOption[];
}

interface ConversationNode {
  initialMessages: Message[];
  options: ConversationOption[];
}

// Coach Melissa conversation tree
const MELISSA_CONVERSATION: ConversationNode = {
  initialMessages: [
    {
      id: 'm1',
      role: 'assistant',
      content: 'Ciao! Sono Melissa, il tuo coach di apprendimento. Sono qui per aiutarti a studiare in modo piu efficace. Come posso aiutarti oggi?',
    },
  ],
  options: [
    {
      id: 'focus',
      text: 'Non riesco a concentrarmi',
      nextMessages: [
        { id: 'm2', role: 'user', content: 'Non riesco a concentrarmi...' },
        {
          id: 'm3',
          role: 'assistant',
          content: 'Capisco perfettamente! La concentrazione e una sfida comune, soprattutto con tutti gli stimoli di oggi. Posso suggerirti una tecnica che funziona benissimo: la tecnica del Pomodoro.',
        },
        {
          id: 'm4',
          role: 'assistant',
          content: 'Funziona cosi: studi intensamente per 25 minuti, poi fai una pausa di 5 minuti. Dopo 4 "pomodori", fai una pausa piu lunga di 15-30 minuti. Vuoi provare insieme?',
        },
      ],
      nextOptions: [
        {
          id: 'pomodoro-yes',
          text: 'Si, proviamo!',
          nextMessages: [
            { id: 'm5', role: 'user', content: 'Si, proviamo!' },
            {
              id: 'm6',
              role: 'assistant',
              content: 'Perfetto! Prima di iniziare, prepara tutto quello che ti serve: libri, quaderni, penne. Metti il telefono in silenzioso o in un altra stanza. Sei pronto?',
            },
          ],
        },
        {
          id: 'pomodoro-no',
          text: 'Ho gia provato, non funziona',
          nextMessages: [
            { id: 'm5b', role: 'user', content: 'Ho gia provato, non funziona per me...' },
            {
              id: 'm6b',
              role: 'assistant',
              content: 'Capisco, non tutti funzioniamo allo stesso modo! Possiamo provare altre strategie. Alcune persone preferiscono sessioni piu lunghe con meno pause, altre hanno bisogno di movimento tra una sessione e laltra. Cosa pensi possa funzionare meglio per te?',
            },
          ],
        },
      ],
    },
    {
      id: 'organize',
      text: 'Come organizzo lo studio?',
      nextMessages: [
        { id: 'o1', role: 'user', content: 'Come organizzo lo studio?' },
        {
          id: 'o2',
          role: 'assistant',
          content: 'Ottima domanda! Organizzare lo studio e fondamentale. Ti suggerisco di creare un piano settimanale. Prima di tutto: quali materie devi studiare questa settimana?',
        },
        {
          id: 'o3',
          role: 'assistant',
          content: 'Un consiglio prezioso: inizia sempre dalla materia piu difficile quando sei fresco, e lascia quelle piu facili per dopo. E ricorda: meglio studiare un po ogni giorno che tutto l ultimo momento!',
        },
      ],
      nextOptions: [
        {
          id: 'plan',
          text: 'Puoi aiutarmi a fare un piano?',
          nextMessages: [
            { id: 'o4', role: 'user', content: 'Puoi aiutarmi a fare un piano?' },
            {
              id: 'o5',
              role: 'assistant',
              content: 'Certo! In modalita completa, potrei creare un piano personalizzato basato sulle tue materie, il tempo disponibile e le tue preferenze. Per ora, ecco un template semplice: Mattina = Materia difficile, Pomeriggio = Ripasso, Sera = Lettura leggera.',
            },
          ],
        },
      ],
    },
    {
      id: 'overwhelmed',
      text: 'Mi sento sopraffatto',
      nextMessages: [
        { id: 's1', role: 'user', content: 'Mi sento sopraffatto da tutto...' },
        {
          id: 's2',
          role: 'assistant',
          content: 'Respira con me per un momento. Inspirare... espirare... E normale sentirsi cosi, specialmente quando ci sono tante cose da fare.',
        },
        {
          id: 's3',
          role: 'assistant',
          content: 'Proviamo a scomporre il problema: invece di pensare a TUTTO, scegliamo UNA cosa da fare adesso. Qual e la cosa piu urgente che ti viene in mente?',
        },
      ],
      nextOptions: [
        {
          id: 'step-by-step',
          text: 'Un passo alla volta, ok...',
          nextMessages: [
            { id: 's4', role: 'user', content: 'Ok, un passo alla volta...' },
            {
              id: 's5',
              role: 'assistant',
              content: 'Esatto! Questa e la mentalita giusta. Ricorda: non devi essere perfetto, devi solo fare un piccolo passo avanti ogni giorno. Sono fiera di te per aver chiesto aiuto!',
            },
          ],
        },
      ],
    },
  ],
};

// Buddy Mario conversation tree
const MARIO_CONVERSATION: ConversationNode = {
  initialMessages: [
    {
      id: 'b1',
      role: 'assistant',
      content: 'Ehi! Sono Mario, ho 15 anni. Anche io ho la dislessia, quindi so cosa significa avere delle sfide con lo studio. Di cosa vuoi parlare?',
    },
  ],
  options: [
    {
      id: 'lonely',
      text: 'Mi sento solo a scuola',
      nextMessages: [
        { id: 'l1', role: 'user', content: 'Mi sento solo a scuola...' },
        {
          id: 'l2',
          role: 'assistant',
          content: 'Ci sono passato anche io, e fa male... A volte sembra che nessuno capisca cosa significa avere difficolta diverse dagli altri.',
        },
        {
          id: 'l3',
          role: 'assistant',
          content: 'Ma sai cosa ho scoperto? Ci sono piu persone come noi di quanto pensi. E la dislessia non e una debolezza - abbiamo cervelli che funzionano in modo diverso, e questo puo essere un superpotere!',
        },
      ],
      nextOptions: [
        {
          id: 'superpower',
          text: 'Un superpotere? Come?',
          nextMessages: [
            { id: 'l4', role: 'user', content: 'Un superpotere? Come?' },
            {
              id: 'l5',
              role: 'assistant',
              content: 'Pensa a queste persone: Albert Einstein, Steven Spielberg, Richard Branson... tutti dislessici! Spesso siamo piu creativi, pensiamo fuori dagli schemi, e vediamo connessioni che altri non vedono. Quale credi sia il TUO superpotere?',
            },
          ],
        },
      ],
    },
    {
      id: 'homework',
      text: 'I compiti mi stressano',
      nextMessages: [
        { id: 'h1', role: 'user', content: 'I compiti mi stressano tantissimo...' },
        {
          id: 'h2',
          role: 'assistant',
          content: 'Uffa, ti capisco! Quando vedo una pagina piena di testo, le lettere sembrano ballare. Ma ho trovato dei trucchi che mi aiutano.',
        },
        {
          id: 'h3',
          role: 'assistant',
          content: 'Per esempio, uso un righello colorato sotto la riga che leggo, e divido i compiti in pezzi piccoli. Poi mi premio dopo ogni pezzo - tipo 10 minuti di videogiochi! Tu hai trovato qualche trucco che funziona?',
        },
      ],
      nextOptions: [
        {
          id: 'tricks',
          text: 'No, dimmi i tuoi trucchi!',
          nextMessages: [
            { id: 'h4', role: 'user', content: 'No, non ne ho... dimmi i tuoi trucchi!' },
            {
              id: 'h5',
              role: 'assistant',
              content: 'Ok! Ecco i miei preferiti: 1) Font speciali come OpenDyslexic (le lettere sono pesanti sotto), 2) Ascolto audiolibri invece di leggere, 3) Faccio mappe mentali invece di appunti lineari. Provali e vedi cosa funziona per te!',
            },
          ],
        },
      ],
    },
    {
      id: 'math',
      text: 'Non capisco matematica',
      nextMessages: [
        { id: 'x1', role: 'user', content: 'Non capisco proprio matematica...' },
        {
          id: 'x2',
          role: 'assistant',
          content: 'Ah, la matematica! Per me i numeri si mischiano come le lettere a volte. Ma sai cosa? Non sei stupido se non capisci subito - il cervello ha solo bisogno di piu tempo o di un modo diverso di vedere le cose.',
        },
        {
          id: 'x3',
          role: 'assistant',
          content: 'Hai provato a parlare con Archimede? E uno dei Professori qui - spiega la matematica in modo che ha senso anche per me. E non ti giudica mai se non capisci al primo colpo!',
        },
      ],
      nextOptions: [
        {
          id: 'archimedes',
          text: 'Chi e Archimede?',
          nextMessages: [
            { id: 'x4', role: 'user', content: 'Chi e Archimede?' },
            {
              id: 'x5',
              role: 'assistant',
              content: 'E un antico genio greco che ha inventato un sacco di cose! Qui su MirrorBuddy, ti puo insegnare matematica in modo divertente. In modalita completa, potresti parlarci e fare domande. Lui e super paziente!',
            },
          ],
        },
      ],
    },
  ],
};

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <motion.span
        className="w-2 h-2 bg-white/60 rounded-full"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
      />
      <motion.span
        className="w-2 h-2 bg-white/60 rounded-full"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
      />
      <motion.span
        className="w-2 h-2 bg-white/60 rounded-full"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
      />
    </div>
  );
}

// Message bubble component
function MessageBubble({ message, characterColor }: { message: Message; characterColor: string }) {
  const isAssistant = message.role === 'assistant';

  if (message.isTyping) {
    return (
      <div className="flex justify-start">
        <div
          className="rounded-2xl rounded-bl-md max-w-[80%]"
          style={{ backgroundColor: `${characterColor}30` }}
        >
          <TypingIndicator />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex', isAssistant ? 'justify-start' : 'justify-end')}
    >
      <div
        className={cn(
          'px-4 py-3 rounded-2xl max-w-[80%]',
          isAssistant
            ? 'rounded-bl-md'
            : 'rounded-br-md bg-purple-500'
        )}
        style={isAssistant ? { backgroundColor: `${characterColor}30` } : {}}
      >
        <p className="text-white text-sm leading-relaxed">{message.content}</p>
      </div>
    </motion.div>
  );
}

// Chat component for each character
function ChatView({
  conversation,
  characterName,
  characterColor,
  characterAvatar,
}: {
  conversation: ConversationNode;
  characterName: string;
  characterColor: string;
  characterAvatar: string;
}) {
  const [messages, setMessages] = useState<Message[]>(conversation.initialMessages);
  const [currentOptions, setCurrentOptions] = useState<ConversationOption[]>(conversation.options);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleOptionClick = useCallback((option: ConversationOption) => {
    setIsTyping(true);
    setCurrentOptions([]);

    // Add typing indicator
    const typingMessage: Message = { id: 'typing', role: 'assistant', content: '', isTyping: true };

    // Simulate typing delay for each message
    let delay = 0;
    option.nextMessages.forEach((msg) => {
      if (msg.role === 'user') {
        // User messages appear immediately
        setTimeout(() => {
          setMessages(prev => [...prev, msg]);
        }, delay);
        delay += 500;
      } else {
        // Show typing indicator
        setTimeout(() => {
          setMessages(prev => [...prev.filter(m => !m.isTyping), typingMessage]);
        }, delay);
        delay += 1000 + Math.random() * 1000; // Random typing time

        // Then show the message
        setTimeout(() => {
          setMessages(prev => [...prev.filter(m => !m.isTyping), msg]);
        }, delay);
        delay += 300;
      }
    });

    // Show next options after all messages
    setTimeout(() => {
      setIsTyping(false);
      if (option.nextOptions) {
        setCurrentOptions(option.nextOptions);
      }
    }, delay + 500);
  }, []);

  const handleReset = useCallback(() => {
    setMessages(conversation.initialMessages);
    setCurrentOptions(conversation.options);
    setIsTyping(false);
  }, [conversation]);

  return (
    <div className="flex flex-col h-[500px]">
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/30"
          >
            <Image
              src={characterAvatar}
              alt={characterName}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div>
            <h3 className="font-semibold text-white">{characterName}</h3>
            <span className="text-xs text-green-400">Online</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="text-white/60 hover:text-white"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} characterColor={characterColor} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Options area */}
      <div className="p-4 border-t border-white/10">
        {currentOptions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-white/40 mb-2">Scegli una risposta:</p>
            {currentOptions.map(option => (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                disabled={isTyping}
                className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white transition-colors flex items-center justify-between group disabled:opacity-50"
              >
                {option.text}
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        ) : !isTyping ? (
          <div className="text-center py-4">
            <p className="text-white/40 text-sm mb-3">Fine della conversazione demo</p>
            <Button
              onClick={handleReset}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Ricomincia
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-white/40 text-sm">Sta scrivendo...</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
