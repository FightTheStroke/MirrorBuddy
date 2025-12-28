'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  Clock,
  Trophy,
  Brain,
  MessageSquare,
  Star,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Award,
  Target,
  Flame,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProgressStore } from '@/lib/stores/app-store';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'sessions' | 'quizzes' | 'achievements';

interface DiaryEntry {
  id: string;
  type: 'session' | 'quiz' | 'achievement' | 'streak';
  date: Date;
  title: string;
  description: string;
  details?: {
    duration?: number;
    xp?: number;
    grade?: number;
    maestroId?: string;
    subject?: string;
  };
}

export function LibrettoView() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const { sessionHistory, achievements, streak, totalStudyMinutes, questionsAsked } = useProgressStore();

  // Extract streak value for dependency tracking
  const currentStreak = streak.current;

  // Build diary entries from session history and achievements
  const entries: DiaryEntry[] = useMemo(() => {
    const result: DiaryEntry[] = [];

    // Add sessions
    sessionHistory.forEach(session => {
      if (session.endedAt) {
        result.push({
          id: `session-${session.id}`,
          type: 'session',
          date: new Date(session.startedAt),
          title: `Sessione di studio`,
          description: `${session.subject || 'Studio generale'} con il maestro`,
          details: {
            duration: session.durationMinutes,
            xp: session.xpEarned,
            grade: session.grade?.score,
            maestroId: session.maestroId,
            subject: session.subject,
          },
        });
      }
    });

    // Add achievements
    achievements.filter(a => a.unlockedAt).forEach(achievement => {
      result.push({
        id: `achievement-${achievement.id}`,
        type: 'achievement',
        date: new Date(achievement.unlockedAt!),
        title: achievement.name || 'Achievement sbloccato',
        description: achievement.description || 'Hai raggiunto un nuovo traguardo!',
        details: {
          xp: achievement.xpReward,
        },
      });
    });

    // Add streak milestones
    if (currentStreak >= 7) {
      result.push({
        id: 'streak-week',
        type: 'streak',
        date: new Date(),
        title: 'Streak settimanale!',
        description: `${currentStreak} giorni consecutivi di studio`,
        details: { xp: 50 },
      });
    }

    // Sort by date (newest first)
    return result.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [sessionHistory, achievements, currentStreak]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    if (filter === 'sessions') return entries.filter(e => e.type === 'session');
    if (filter === 'achievements') return entries.filter(e => e.type === 'achievement' || e.type === 'streak');
    return entries;
  }, [entries, filter]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: Map<string, DiaryEntry[]> = new Map();

    filteredEntries.forEach(entry => {
      const dateKey = entry.date.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(entry);
    });

    return groups;
  }, [filteredEntries]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const getEntryIcon = (type: DiaryEntry['type']) => {
    switch (type) {
      case 'session':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'achievement':
        return <Trophy className="w-5 h-5 text-amber-500" />;
      case 'streak':
        return <Flame className="w-5 h-5 text-orange-500" />;
      default:
        return <BookOpen className="w-5 h-5 text-slate-500" />;
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 9) return 'text-green-500 bg-green-100 dark:bg-green-900/30';
    if (grade >= 7) return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
    if (grade >= 6) return 'text-amber-500 bg-amber-100 dark:bg-amber-900/30';
    return 'text-red-500 bg-red-100 dark:bg-red-900/30';
  };

  // Calculate stats
  const totalSessions = sessionHistory.filter(s => s.endedAt).length;
  const avgGrade = sessionHistory
    .filter(s => s.grade?.score)
    .reduce((acc, s, _, arr) => acc + (s.grade!.score / arr.length), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-500" />
            Il Mio Libretto
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Il diario del tuo percorso di apprendimento
          </p>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalSessions}</p>
                <p className="text-xs text-slate-500">Sessioni totali</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
                </p>
                <p className="text-xs text-slate-500">Tempo totale</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {avgGrade > 0 ? avgGrade.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-slate-500">Media voti</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{questionsAsked}</p>
                <p className="text-xs text-slate-500">Domande fatte</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all' as const, label: 'Tutto', icon: BookOpen },
          { id: 'sessions' as const, label: 'Sessioni', icon: MessageSquare },
          { id: 'achievements' as const, label: 'Traguardi', icon: Trophy },
        ].map(f => (
          <Button
            key={f.id}
            variant={filter === f.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.id)}
            className="gap-2"
          >
            <f.icon className="w-4 h-4" />
            {f.label}
          </Button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
                Il tuo libretto e vuoto
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Inizia una sessione di studio per registrare i tuoi progressi!
              </p>
            </CardContent>
          </Card>
        ) : (
          Array.from(groupedEntries.entries()).map(([date, dateEntries]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-medium text-slate-500 capitalize">{date}</h3>
              </div>

              {/* Entries for this date */}
              <div className="space-y-3 ml-6 border-l-2 border-slate-200 dark:border-slate-700 pl-6">
                <AnimatePresence>
                  {dateEntries.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="overflow-hidden">
                        <div
                          className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          onClick={() => toggleExpanded(entry.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {getEntryIcon(entry.type)}
                              </div>
                              <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">
                                  {entry.title}
                                </h4>
                                <p className="text-sm text-slate-500">
                                  {entry.description}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {entry.date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {entry.details?.grade && (
                                <span className={cn(
                                  'px-2 py-1 rounded-full text-sm font-bold',
                                  getGradeColor(entry.details.grade)
                                )}>
                                  {entry.details.grade}/10
                                </span>
                              )}
                              {entry.details?.xp && entry.details.xp > 0 && (
                                <span className="text-sm text-amber-600 font-medium">
                                  +{entry.details.xp} XP
                                </span>
                              )}
                              {expandedEntries.has(entry.id) ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Expanded details */}
                          <AnimatePresence>
                            {expandedEntries.has(entry.id) && entry.details && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700"
                              >
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {entry.details.duration && (
                                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                      <Clock className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                                      <p className="text-sm font-medium">{entry.details.duration} min</p>
                                      <p className="text-xs text-slate-400">Durata</p>
                                    </div>
                                  )}
                                  {entry.details.subject && (
                                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                      <Target className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                                      <p className="text-sm font-medium">{entry.details.subject}</p>
                                      <p className="text-xs text-slate-400">Materia</p>
                                    </div>
                                  )}
                                  {entry.details.xp !== undefined && (
                                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                      <TrendingUp className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                                      <p className="text-sm font-medium">+{entry.details.xp}</p>
                                      <p className="text-xs text-slate-400">XP guadagnati</p>
                                    </div>
                                  )}
                                  {entry.details.grade && (
                                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                      <Award className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                                      <p className="text-sm font-medium">{entry.details.grade}/10</p>
                                      <p className="text-xs text-slate-400">Valutazione</p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
