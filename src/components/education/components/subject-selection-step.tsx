"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types";
import type { ToolType } from "@/types/tools";

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
  storytelling: "Storytelling",
  astronomy: "Astronomia",
  "computer-science": "Informatica",
  "civic-education": "Educazione Civica",
  science: "Scienze",
  "physical-education": "Educazione Fisica",
};

const TOOL_LABELS: Record<ToolType, string> = {
  mindmap: "Mappa Mentale",
  quiz: "Quiz",
  flashcard: "Flashcard",
  summary: "Riassunto",
  demo: "Demo Interattiva",
  diagram: "Diagramma",
  timeline: "Linea del Tempo",
  formula: "Formula",
  calculator: "Calcolatrice",
  chart: "Grafico",
  search: "Ricerca",
  webcam: "Foto",
  "webcam-standalone": "Foto Standalone",
  pdf: "PDF",
  homework: "Compiti",
  typing: "Impara a Digitare",
  "study-kit": "Study Kit",
};

const getSubjectLabel = (subject: string): string => {
  return (
    SUBJECT_LABELS[subject] ||
    subject.charAt(0).toUpperCase() + subject.slice(1).replace(/-/g, " ")
  );
};

interface SubjectSelectionStepProps {
  toolType: ToolType;
  subjects: Subject[];
  onSubjectSelect: (subject: Subject) => void;
}

export function SubjectSelectionStep({
  toolType,
  subjects,
  onSubjectSelect,
}: SubjectSelectionStepProps) {
  const toolLabel = TOOL_LABELS[toolType] || toolType;

  return (
    <motion.div
      key="subject"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <p className="text-slate-600 dark:text-slate-400 mb-4">
        Di quale materia vuoi fare {toolLabel.toLowerCase()}?
      </p>
      <div className="grid grid-cols-3 gap-2">
        {subjects.map((subject) => (
          <button
            key={subject}
            onClick={() => onSubjectSelect(subject)}
            className={cn(
              "p-3 text-sm rounded-lg border-2 transition-all font-medium",
              "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
              "hover:border-accent-themed hover:bg-accent-themed/10",
            )}
          >
            {getSubjectLabel(subject)}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
