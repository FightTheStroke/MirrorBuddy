/**
 * Filter UI component for Teacher Diary
 */

import { Filter, Search, X } from 'lucide-react';
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
  return (
    <div className="mt-2 space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cerca nelle osservazioni..."
          className="w-full pl-10 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Cancella ricerca"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Filtri:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Maestro filter */}
          <Select value={selectedMaestro} onValueChange={onMaestroChange}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Tutti i Professori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i Professori</SelectItem>
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
              <SelectValue placeholder="Tutte le materie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le materie</SelectItem>
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
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutto</SelectItem>
              <SelectItem value="week">Ultima settimana</SelectItem>
              <SelectItem value="month">Ultimo mese</SelectItem>
              <SelectItem value="3months">Ultimi 3 mesi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
