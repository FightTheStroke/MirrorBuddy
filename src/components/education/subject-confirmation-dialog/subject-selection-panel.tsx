"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAllSubjects } from "@/data";
import type { Subject } from "@/types";

// Italian labels for subjects
const SUBJECT_LABELS: Record<string, string> = {
  mathematics: "Matematica",
  physics: "Fisica",
  chemistry: "Chimica",
  biology: "Biologia",
  history: "Storia",
  geography: "Geografia",
  italian: "Italiano",
  english: "Inglese",
  art: "Arte",
  music: "Musica",
  civics: "Educazione Civica",
  economics: "Economia",
  computerScience: "Informatica",
  health: "Salute",
  philosophy: "Filosofia",
  internationalLaw: "Diritto Internazionale",
  astronomy: "Astronomia",
  "computer-science": "Informatica",
  "civic-education": "Educazione Civica",
  science: "Scienze",
  storytelling: "Storytelling",
  "physical-education": "Educazione Fisica",
};

type DetectedSubject = Subject | "other" | "unknown";

interface SubjectSelectionPanelProps {
  detectedSubject: DetectedSubject;
  selectedSubject: Subject;
  onSelectSubject: (subject: Subject) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const isValidSubject = (subject: DetectedSubject): subject is Subject => {
  return subject !== "other" && subject !== "unknown";
};

const getSubjectLabel = (subject: string): string => {
  if (!subject || subject === "other" || subject === "unknown") {
    return "Non riconosciuta";
  }
  return (
    SUBJECT_LABELS[subject] ||
    subject.charAt(0).toUpperCase() + subject.slice(1).replace(/-/g, " ")
  );
};

export function SubjectSelectionPanel({
  detectedSubject,
  selectedSubject,
  onSelectSubject,
  onConfirm,
  onClose,
}: SubjectSelectionPanelProps) {
  const t = useTranslations("education.subjectConfirmation.subjectPanel");
  const allSubjects = getAllSubjects();

  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {isValidSubject(detectedSubject) ? (
          <>
            {t("detected")}{" "}
            <span className="font-semibold text-blue-600">
              {getSubjectLabel(detectedSubject)}
            </span>
            .{t("confirmOrSelect")}
          </>
        ) : (
          <>
            {t("unrecognized")}
            {t("selectCorrect")}
          </>
        )}
      </p>

      <div className="grid grid-cols-3 gap-2 mb-6">
        {allSubjects.map((subject) => (
          <button
            key={subject}
            onClick={() => onSelectSubject(subject)}
            className={cn(
              "p-3 text-sm rounded-lg border-2 transition-all font-medium",
              selectedSubject === subject
                ? "bg-accent-themed text-white border-accent-themed shadow-md"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-accent-themed hover:bg-accent-themed/10",
            )}
          >
            {getSubjectLabel(subject)}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("cancel")}
        </Button>
        <Button onClick={onConfirm} className="flex-1" size="lg">
          {t("confirm")} {getSubjectLabel(selectedSubject)}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

export { getSubjectLabel, isValidSubject, SUBJECT_LABELS };
export type { DetectedSubject };
