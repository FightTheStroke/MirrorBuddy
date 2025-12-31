'use client';

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MaestroCard } from './maestro-card';
import { LazyVoiceSession } from '@/components/voice/lazy';
import { LazyChatSession } from '@/components/chat/lazy';
import { maestri, subjectNames, subjectIcons, subjectColors, getAllSubjects } from '@/data';
import { cn } from '@/lib/utils';
import type { Maestro, Subject } from '@/types';
import type { ToolType } from '@/types/tools';

type SessionMode = 'voice' | 'chat' | null;

export function MaestriGrid() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'all'>('all');
  const [selectedMaestro, setSelectedMaestro] = useState<Maestro | null>(null);
  const [sessionMode, setSessionMode] = useState<SessionMode>(null);
  const [sessionKey, setSessionKey] = useState(0); // Key to force remount on session restart

  const subjects = getAllSubjects();

  // Filter maestri based on search and subject (React Compiler handles memoization)
  const filteredMaestri = maestri.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subjectNames[m.subject].toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject =
      selectedSubject === 'all' || m.subject === selectedSubject;

    return matchesSearch && matchesSubject;
  });

  // Click on maestro goes directly to voice
  const handleSelect = (maestro: Maestro) => {
    setSessionKey(prev => prev + 1); // Force fresh component mount
    setSelectedMaestro(maestro);
    setSessionMode('voice');
  };

  const handleCloseSession = () => {
    setSessionMode(null);
    setSelectedMaestro(null);
  };

  // Handle tool request from maestro card - opens chat with tool request
  const handleToolRequest = (maestro: Maestro, tool: ToolType) => {
    setSessionKey(prev => prev + 1);
    setSelectedMaestro(maestro);
    // For tools, we start in chat mode so the tool can be built
    setSessionMode('chat');
    // Store tool request in sessionStorage for chat to pick up
    sessionStorage.setItem('pendingToolRequest', JSON.stringify({ tool, maestroId: maestro.id }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            I Tuoi Professori
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Scegli un professore per iniziare a studiare
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca professore o materia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Subject filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSubject('all')}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all',
            selectedSubject === 'all'
              ? 'bg-accent-themed text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          ✨ Tutti ({maestri.length})
        </button>
        {subjects.map((subject) => {
          const count = maestri.filter((m) => m.subject === subject).length;
          const isSelected = selectedSubject === subject;
          return (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all',
                isSelected
                  ? 'text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
              style={
                isSelected
                  ? { backgroundColor: subjectColors[subject] }
                  : {}
              }
            >
              <span>{subjectIcons[subject]}</span>
              {subjectNames[subject]} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {filteredMaestri.map((maestro, index) => (
          <motion.div
            key={maestro.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.05 }}
          >
            <MaestroCard
              maestro={maestro}
              onSelect={handleSelect}
              showToolButtons={true}
              onToolRequest={handleToolRequest}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Empty state */}
      {filteredMaestri.length === 0 && (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 mx-auto text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
            Nessun professore trovato
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Prova a modificare i filtri di ricerca
          </p>
        </div>
      )}

      {/* Voice session (lazy loaded) */}
      <AnimatePresence mode="wait">
        {sessionMode === 'voice' && selectedMaestro && (
          <LazyVoiceSession
            key={`voice-${selectedMaestro.id}-${sessionKey}`}
            maestro={selectedMaestro}
            onClose={handleCloseSession}
            onSwitchToChat={() => setSessionMode('chat')}
          />
        )}
      </AnimatePresence>

      {/* Chat session (lazy loaded) */}
      <AnimatePresence mode="wait">
        {sessionMode === 'chat' && selectedMaestro && (
          <LazyChatSession
            key={`chat-${selectedMaestro.id}`}
            maestro={selectedMaestro}
            onClose={handleCloseSession}
            onSwitchToVoice={() => {
              setSessionMode('voice');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
