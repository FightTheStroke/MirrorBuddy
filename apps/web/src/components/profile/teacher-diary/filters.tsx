/**
 * Filter UI component for Teacher Diary
 */

import { Filter, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUBJECT_NAMES } from '@/data/maestri';
import { getMaestroSubject } from '@/lib/profile/parent-suggestions';

interface TeacherDiaryFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedMaestro: string;
  onMaestroChange: (maestroId: string) => void;
  selectedSubject: string;
  onSubjectChange: (subject: string) => void;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  maestriOptions: Array<{ id: string; name: string }>;
  subjectsOptions: string[];
}

export function TeacherDiaryFilters({
  searchQuery,
  onSearchChange,
  selectedMaestro,
  onMaestroChange,
  selectedSubject,
  onSubjectChange,
  selectedPeriod,
  onPeriodChange,
  maestriOptions,
  subjectsOptions,
}: TeacherDiaryFiltersProps) {
  const t = useTranslations('settings.parentDashboard');
  return (
    <div className="mt-2 space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label={t('clearSearchAriaLabel')}
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">{t('filters')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Maestro filter */}
          <Select value={selectedMaestro} onValueChange={onMaestroChange}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder={t('allTeachers')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTeachers')}</SelectItem>
              {maestriOptions.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Subject filter */}
          <Select value={selectedSubject} onValueChange={onSubjectChange}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder={t('allSubjects')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allSubjects')}</SelectItem>
              {subjectsOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {SUBJECT_NAMES[s] || getMaestroSubject(s) || s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Period filter */}
          <Select value={selectedPeriod} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder={t("periodo")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("tutto")}</SelectItem>
              <SelectItem value="week">{t("ultimaSettimana")}</SelectItem>
              <SelectItem value="month">{t("ultimoMese")}</SelectItem>
              <SelectItem value="3months">{t("ultimi3Mesi")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
