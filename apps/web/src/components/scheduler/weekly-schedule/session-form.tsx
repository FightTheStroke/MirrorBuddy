"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DAYS_OF_WEEK, SUBJECTS, TIME_OPTIONS } from "./constants";
import { DURATION_OPTIONS } from "./duration-options";
import type { DayOfWeek } from "@/lib/scheduler/types";

export interface SessionFormData {
  dayOfWeek: DayOfWeek;
  time: string;
  duration: number;
  subject: string;
  topic?: string;
}

const INITIAL_FORM: SessionFormData = {
  dayOfWeek: 1 as DayOfWeek,
  time: "16:00",
  duration: 30,
  subject: "matematica",
};

interface SessionFormProps {
  showForm: boolean;
  editingId: string | null;
  formData: SessionFormData;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onFormChange: (data: SessionFormData) => void;
}

export function SessionForm({
  showForm,
  editingId,
  formData,
  submitting,
  onSubmit,
  onCancel,
  onFormChange,
}: SessionFormProps) {
  const t = useTranslations("education.scheduler");
  return (
    <AnimatePresence>
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 space-y-4">
            <h4 className="font-medium text-slate-900 dark:text-white">
              {editingId ? t("form.titleEdit") : t("form.titleNew")}
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t("form.day")}
                </label>
                <select
                  value={formData.dayOfWeek}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      dayOfWeek: Number(e.target.value) as DayOfWeek,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t("form.time")}
                </label>
                <select
                  value={formData.time}
                  onChange={(e) =>
                    onFormChange({ ...formData, time: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t("form.duration")}
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      duration: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t("form.subject")}
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) =>
                    onFormChange({ ...formData, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {SUBJECTS.map((subj) => (
                    <option key={subj.value} value={subj.value}>
                      {subj.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t("form.topic")}
              </label>
              <input
                type="text"
                value={formData.topic || ""}
                onChange={(e) =>
                  onFormChange({ ...formData, topic: e.target.value })
                }
                placeholder={t("form.topicPlaceholder")}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={submitting}
              >
                <X className="w-4 h-4 mr-1" />
                {t("form.cancel")}
              </Button>
              <Button size="sm" onClick={onSubmit} disabled={submitting}>
                <Check className="w-4 h-4 mr-1" />
                {submitting
                  ? t("form.saving")
                  : editingId
                    ? t("form.save")
                    : t("form.add")}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { INITIAL_FORM };
