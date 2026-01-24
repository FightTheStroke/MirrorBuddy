"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface LimitsSectionProps {
  formData: {
    chatLimitDaily: number;
    voiceMinutesDaily: number;
    toolsLimitDaily: number;
    docsLimitTotal: number;
  };
  onChange: (data: Partial<LimitsSectionProps["formData"]>) => void;
}

// Validation constraints
const LIMITS = {
  chatLimitDaily: { min: 0, max: 500, label: "Chat Giornalieri" },
  voiceMinutesDaily: { min: 0, max: 1440, label: "Minuti Voce" },
  toolsLimitDaily: { min: 0, max: 500, label: "Strumenti" },
  docsLimitTotal: { min: 0, max: 10000, label: "Documenti" },
} as const;

interface FieldError {
  [key: string]: string | null;
}

export function LimitsSection({ formData, onChange }: LimitsSectionProps) {
  const [errors, setErrors] = useState<FieldError>({});

  const validateField = (
    fieldName: keyof typeof LIMITS,
    value: number,
  ): string | null => {
    const limit = LIMITS[fieldName];

    if (value < limit.min) {
      return `Minimo: ${limit.min}`;
    }
    if (value > limit.max) {
      return `Massimo: ${limit.max}`;
    }
    return null;
  };

  const handleFieldChange = (fieldName: keyof typeof LIMITS, value: string) => {
    const numValue = parseInt(value, 10);

    if (isNaN(numValue)) {
      setErrors((prev) => ({ ...prev, [fieldName]: "Inserisci un numero" }));
      return;
    }

    const error = validateField(fieldName, numValue);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));

    if (!error) {
      onChange({ [fieldName]: numValue });
    }
  };

  const renderField = (
    fieldName: keyof typeof LIMITS,
    label: string,
    description: string,
  ) => {
    const limit = LIMITS[fieldName];
    const error = errors[fieldName];
    const value = formData[fieldName];

    return (
      <div key={fieldName} className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor={fieldName}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Max: {limit.max}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
          {description}
        </p>

        <div className="relative">
          <Input
            id={fieldName}
            name={fieldName}
            type="number"
            min={limit.min}
            max={limit.max}
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            onBlur={(e) => {
              const numValue = parseInt(e.target.value, 10);
              if (!isNaN(numValue)) {
                const error = validateField(fieldName, numValue);
                setErrors((prev) => ({ ...prev, [fieldName]: error }));
              }
            }}
            className={error ? "border-red-500 focus:ring-red-500" : ""}
            placeholder={`Min: ${limit.min}, Max: ${limit.max}`}
          />
        </div>

        {error && (
          <div role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-foreground">Limiti</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderField(
          "chatLimitDaily",
          "Messaggi Chat Giornalieri",
          "Numero massimo di messaggi che un utente può inviare al giorno",
        )}

        {renderField(
          "voiceMinutesDaily",
          "Minuti Voce Giornalieri",
          "Minuti di utilizzo voce disponibili al giorno per l'utente",
        )}

        {renderField(
          "toolsLimitDaily",
          "Strumenti Giornalieri",
          "Numero massimo di strumenti che possono essere utilizzati al giorno",
        )}

        {renderField(
          "docsLimitTotal",
          "Documenti Totali",
          "Numero massimo di documenti che un utente può caricare in totale",
        )}
      </div>
    </div>
  );
}
