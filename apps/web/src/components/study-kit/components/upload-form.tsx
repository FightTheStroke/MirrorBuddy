'use client';

import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from "next-intl";

interface UploadFormProps {
  title: string;
  subject: string;
  error: string;
  isLoading: boolean;
  onTitleChange: (title: string) => void;
  onSubjectChange: (subject: string) => void;
  onSubmit: () => void;
}

export function UploadForm({
  title,
  subject,
  error,
  isLoading,
  onTitleChange,
  onSubjectChange,
  onSubmit,
}: UploadFormProps) {
  const t = useTranslations("education");
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t("titolo")}
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t("esRivoluzioneFrancese")}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          required
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t("materiaOpzionale")}
        </label>
        <input
          id="subject"
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder={t("esStoria")}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        onClick={onSubmit}
        disabled={!title || isLoading}
        className="w-full"
        size="lg"
      >
        <Upload className="w-4 h-4 mr-2" />
        {t("generaStudyKit")}
      </Button>
    </div>
  );
}
