/**
 * @file dashboard-content.tsx
 * @brief Main dashboard content with tabs
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParentDashboard } from '@/components/profile/parent-dashboard';
import { TeacherDiary, type DiaryEntry } from '@/components/profile/teacher-diary';
import { ProgressTimeline } from '@/components/profile/progress-timeline';
import { BookOpen, User, TrendingUp } from 'lucide-react';
import type { StudentInsights } from '@/types';

interface DashboardContentProps {
  insights: StudentInsights | null;
  diaryEntries: DiaryEntry[];
  isDiaryLoading: boolean;
  onTalkToMaestro: (maestroId: string, maestroName: string) => void;
}

export function DashboardContent({
  insights,
  diaryEntries,
  isDiaryLoading,
  onTalkToMaestro,
}: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<
    'diary' | 'profile' | 'progress'
  >('diary');

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) =>
        setActiveTab(v as 'diary' | 'profile' | 'progress')
      }
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3 mb-6 h-auto">
        <TabsTrigger
          value="diary"
          className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm"
        >
          <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Diario</span>
        </TabsTrigger>
        <TabsTrigger
          value="profile"
          className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm"
        >
          <User className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Profilo</span>
        </TabsTrigger>
        <TabsTrigger
          value="progress"
          className="flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm"
        >
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Progressi</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="diary">
        <TeacherDiary
          entries={diaryEntries}
          studentName={insights?.studentName || 'lo studente'}
          isLoading={isDiaryLoading}
          onTalkToMaestro={onTalkToMaestro}
        />
      </TabsContent>

      <TabsContent value="profile">
        {insights && <ParentDashboard insights={insights} />}
      </TabsContent>

      <TabsContent value="progress">
        <ProgressTimeline
          entries={diaryEntries}
          studentName={insights?.studentName || 'lo studente'}
        />
      </TabsContent>
    </Tabs>
  );
}

