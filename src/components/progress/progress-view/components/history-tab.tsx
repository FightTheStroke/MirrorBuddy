import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useProgressStore } from '@/lib/stores';
import { subjectNames, subjectColors, subjectIcons } from '@/data';
import type { Subject } from '@/types';

export function HistoryTab() {
  const { sessionHistory } = useProgressStore();

  const groupedSessions = useMemo(() => {
    const groups: Map<string, typeof sessionHistory> = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    sessionHistory
      .filter(s => s.endedAt)
      .forEach(session => {
        const sessionDate = new Date(session.startedAt);
        sessionDate.setHours(0, 0, 0, 0);

        let dateKey: string;
        if (sessionDate.getTime() === today.getTime()) {
          dateKey = 'Oggi';
        } else if (sessionDate.getTime() === yesterday.getTime()) {
          dateKey = 'Ieri';
        } else {
          const daysAgo = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysAgo < 7) {
            dateKey = `${daysAgo} giorni fa`;
          } else {
            dateKey = sessionDate.toLocaleDateString('it-IT', {
              day: 'numeric',
              month: 'long',
            });
          }
        }

        if (!groups.has(dateKey)) {
          groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(session);
      });

    return groups;
  }, [sessionHistory]);

  if (sessionHistory.filter(s => s.endedAt).length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
            Nessuna sessione registrata
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            Inizia una sessione di studio per vedere la tua cronologia!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(groupedSessions.entries()).map(([dateLabel, sessions]) => (
        <div key={dateLabel}>
          <h3 className="text-sm font-medium text-slate-500 mb-3">{dateLabel}</h3>
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${subjectColors[session.subject as Subject] || '#6366f1'}20` }}
                    >
                      {subjectIcons[session.subject as Subject] || '📚'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-white">
                        {subjectNames[session.subject as Subject] || session.subject || 'Studio'}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {session.maestroId ? `Professore ${session.maestroId}` : 'Sessione di studio'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {session.durationMinutes || 0} min
                      </p>
                      <p className="text-sm text-slate-500">
                        +{session.xpEarned || 0} XP
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

