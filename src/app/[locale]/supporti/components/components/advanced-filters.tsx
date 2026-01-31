/**
 * @file advanced-filters.tsx
 * @brief Advanced filters panel component
 */

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBJECT_LABELS } from "@/components/education/archive";

interface AdvancedFiltersProps {
  subjectFilter: string | null;
  maestroFilter: string | null;
  subjects: string[];
  allMaestri: Array<{ id: string; name: string }>;
  counts: {
    bySubject: Record<string, number>;
    byMaestro: Record<string, number>;
  };
  onNavigate: (params: Record<string, string | null>) => void;
  hasAdvancedFilters: boolean;
}

export function AdvancedFilters({
  subjectFilter,
  maestroFilter,
  subjects,
  allMaestri,
  counts,
  onNavigate,
  hasAdvancedFilters,
}: AdvancedFiltersProps) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="filter-subject"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block"
            >
              Materia
            </label>
            <Select
              value={subjectFilter || "all"}
              onValueChange={(v) =>
                onNavigate({ subject: v === "all" ? null : v })
              }
            >
              <SelectTrigger
                id="filter-subject"
                className="h-11"
                aria-label="Filtra per materia"
              >
                <SelectValue placeholder="Tutte le materie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le materie</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {SUBJECT_LABELS[subject] || subject}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({counts.bySubject[subject] || 0})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="filter-maestro"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block"
            >
              Maestro
            </label>
            <Select
              value={maestroFilter || "all"}
              onValueChange={(v) =>
                onNavigate({ maestro: v === "all" ? null : v })
              }
            >
              <SelectTrigger
                id="filter-maestro"
                className="h-11"
                aria-label="Filtra per maestro"
              >
                <SelectValue placeholder="Tutti i maestri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i maestri</SelectItem>
                {allMaestri
                  .filter((m) => counts.byMaestro[m.id] > 0)
                  .map((maestro) => (
                    <SelectItem key={maestro.id} value={maestro.id}>
                      {maestro.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({counts.byMaestro[maestro.id] || 0})
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasAdvancedFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate({ subject: null, maestro: null })}
            className="mt-4 text-muted-foreground"
          >
            <X className="w-4 h-4 mr-2" />
            Rimuovi filtri avanzati
          </Button>
        )}
      </div>
    </motion.div>
  );
}
