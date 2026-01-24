"use client";

import { getAllMaestri, SUBJECT_NAMES } from "@/data/maestri";

interface MaestriSectionProps {
  formData: {
    availableMaestri: string[];
  };
  onChange: (data: { availableMaestri: string[] }) => void;
}

export function MaestriSection({ formData, onChange }: MaestriSectionProps) {
  const maestri = getAllMaestri();

  // Group by subject
  const bySubject = maestri.reduce(
    (acc, m) => {
      const subject = m.subject;
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(m);
      return acc;
    },
    {} as Record<string, typeof maestri>,
  );

  const handleToggle = (maestroId: string, enabled: boolean) => {
    const updated = enabled
      ? [...formData.availableMaestri, maestroId]
      : formData.availableMaestri.filter((id) => id !== maestroId);
    onChange({ availableMaestri: updated });
  };

  const isEnabled = (maestroId: string): boolean => {
    return formData.availableMaestri.includes(maestroId);
  };

  const selectAll = () => {
    onChange({ availableMaestri: maestri.map((m) => m.id) });
  };

  const selectNone = () => {
    onChange({ availableMaestri: [] });
  };

  const selectedCount = formData.availableMaestri.length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Maestri Disponibili
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedCount} / {maestri.length} selezionati
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-primary hover:underline"
          >
            Seleziona tutti
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={selectNone}
            className="text-xs text-primary hover:underline"
          >
            Deseleziona tutti
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(bySubject)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([subject, subjectMaestri]) => (
            <div key={subject}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {SUBJECT_NAMES[subject] || subject}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {subjectMaestri.map((maestro) => (
                  <label
                    key={maestro.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      isEnabled(maestro.id)
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isEnabled(maestro.id)}
                      onChange={(e) =>
                        handleToggle(maestro.id, e.target.checked)
                      }
                      className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm">{maestro.displayName}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
