"use client";

import { getAllSupportTeachers } from "@/data/support-teachers";

interface CoachesSectionProps {
  formData: {
    availableCoaches: string[];
  };
  onChange: (data: { availableCoaches: string[] }) => void;
}

export function CoachesSection({ formData, onChange }: CoachesSectionProps) {
  const coaches = getAllSupportTeachers();

  const handleToggle = (coachId: string, enabled: boolean) => {
    const updated = enabled
      ? [...formData.availableCoaches, coachId]
      : formData.availableCoaches.filter((id) => id !== coachId);
    onChange({ availableCoaches: updated });
  };

  const isEnabled = (coachId: string): boolean => {
    return formData.availableCoaches.includes(coachId);
  };

  const selectAll = () => {
    onChange({ availableCoaches: coaches.map((c) => c.id) });
  };

  const selectNone = () => {
    onChange({ availableCoaches: [] });
  };

  const selectedCount = formData.availableCoaches.length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Coach Disponibili
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedCount} / {coaches.length} selezionati
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {coaches.map((coach) => (
          <label
            key={coach.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              isEnabled(coach.id)
                ? "border-primary bg-primary/5"
                : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <input
              type="checkbox"
              checked={isEnabled(coach.id)}
              onChange={(e) => handleToggle(coach.id, e.target.checked)}
              className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-2 focus:ring-primary"
            />
            <div>
              <div className="text-sm font-medium">{coach.name}</div>
              <div className="text-xs text-muted-foreground">
                {coach.personality.slice(0, 50)}...
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
