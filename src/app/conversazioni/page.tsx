'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  ArrowLeft,
  GraduationCap,
  Sparkles,
  Heart,
  MessageCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CharacterChatView } from '@/components/conversation';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/lib/stores/app-store';

type CharacterCategory = 'coach' | 'buddy' | 'maestri';
type CharacterId = 'melissa' | 'roberto' | 'mario' | 'faty' | string;

interface CharacterInfo {
  id: CharacterId;
  name: string;
  role: string;
  description: string;
  avatar: string;
  category: CharacterCategory;
  color: string;
  lastMessage?: string;
  lastMessageTime?: Date;
}

const COACHES: CharacterInfo[] = [
  {
    id: 'melissa',
    name: 'Melissa',
    role: 'Coach di Apprendimento',
    description: 'Ti aiuto a sviluppare il tuo metodo di studio e a gestire il tempo in modo efficace.',
    avatar: '/avatars/melissa.jpg',
    category: 'coach',
    color: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'roberto',
    name: 'Roberto',
    role: 'Coach Motivazionale',
    description: 'Sono qui per motivarti e aiutarti a superare gli ostacoli nel tuo percorso di apprendimento.',
    avatar: '/avatars/roberto.png',
    category: 'coach',
    color: 'from-blue-500 to-cyan-600',
  },
];

const BUDDIES: CharacterInfo[] = [
  {
    id: 'mario',
    name: 'Mario',
    role: 'Amico di Studio',
    description: 'Ehi! Anche io studio come te. Possiamo aiutarci a vicenda e condividere le difficoltà.',
    avatar: '/avatars/mario.jpg',
    category: 'buddy',
    color: 'from-pink-500 to-rose-600',
  },
  {
    id: 'faty',
    name: 'Faty',
    role: 'Compagna di Studio',
    description: 'Ciao! Studiare insieme è più bello. Ti capisco perché sono una studentessa come te.',
    avatar: '/avatars/faty.png',
    category: 'buddy',
    color: 'from-orange-500 to-amber-600',
  },
];

const CATEGORY_TABS = [
  { id: 'coach' as const, label: 'Coach', icon: Sparkles, description: 'Aiuto per il metodo di studio' },
  { id: 'buddy' as const, label: 'Buddy', icon: Heart, description: 'Supporto tra pari' },
  { id: 'maestri' as const, label: 'Maestri', icon: GraduationCap, description: 'Tutor per materia' },
];

export default function ConversazioniPage() {
  const [selectedCategory, setSelectedCategory] = useState<CharacterCategory>('coach');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterInfo | null>(null);
  const { studentProfile } = useSettingsStore();

  const preferredCoach = studentProfile?.preferredCoach || 'melissa';
  const preferredBuddy = studentProfile?.preferredBuddy || 'mario';

  const getCharactersByCategory = (category: CharacterCategory): CharacterInfo[] => {
    switch (category) {
      case 'coach':
        return COACHES;
      case 'buddy':
        return BUDDIES;
      case 'maestri':
        return []; // Maestri handled separately via MaestriGrid
      default:
        return [];
    }
  };

  const characters = getCharactersByCategory(selectedCategory);

  const handleSelectCharacter = (character: CharacterInfo) => {
    setSelectedCharacter(character);
  };

  const handleBackToList = () => {
    setSelectedCharacter(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {selectedCharacter ? selectedCharacter.name : 'Conversazioni'}
              </h1>
              {selectedCharacter && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedCharacter.role}
                </p>
              )}
            </div>
          </div>

          {selectedCharacter && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Image
                  src={selectedCharacter.avatar}
                  alt={selectedCharacter.name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-slate-900 rounded-full" />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {selectedCharacter ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-[calc(100vh-180px)]"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alla lista
              </Button>
              <CharacterChatView
                characterId={selectedCharacter.id as 'melissa' | 'roberto' | 'mario' | 'faty'}
                characterType={selectedCharacter.category === 'buddy' ? 'buddy' : 'coach'}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Category Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategory(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 rounded-xl transition-all whitespace-nowrap',
                      selectedCategory === tab.id
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}
                  >
                    <tab.icon className="w-5 h-5" />
                    <div className="text-left">
                      <p className="font-medium">{tab.label}</p>
                      <p className="text-xs opacity-70">{tab.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Character List */}
              {selectedCategory === 'maestri' ? (
                <div className="text-center py-12">
                  <GraduationCap className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Vai ai Maestri
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Scegli un Maestro dalla pagina principale per studiare una materia.
                  </p>
                  <Link href="/">
                    <Button>
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Vedi i Maestri
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {characters.map((character) => {
                    const isPreferred =
                      (character.category === 'coach' && character.id === preferredCoach) ||
                      (character.category === 'buddy' && character.id === preferredBuddy);

                    return (
                      <Card
                        key={character.id}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1',
                          isPreferred && 'ring-2 ring-primary'
                        )}
                        onClick={() => handleSelectCharacter(character)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="relative flex-shrink-0">
                              <div
                                className={cn(
                                  'w-16 h-16 rounded-full bg-gradient-to-br p-0.5',
                                  character.color
                                )}
                              >
                                <Image
                                  src={character.avatar}
                                  alt={character.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900"
                                />
                              </div>
                              <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-white dark:border-slate-900 rounded-full" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                  {character.name}
                                </h3>
                                {isPreferred && (
                                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    Preferito
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                                {character.role}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                                {character.description}
                              </p>

                              {character.lastMessage && (
                                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                                  <MessageCircle className="w-3 h-3" />
                                  <span className="truncate">{character.lastMessage}</span>
                                  {character.lastMessageTime && (
                                    <>
                                      <Clock className="w-3 h-3 ml-auto" />
                                      <span>
                                        {character.lastMessageTime.toLocaleTimeString('it-IT', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
