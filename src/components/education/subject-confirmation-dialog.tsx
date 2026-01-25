"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Subject, Maestro } from "@/types";
import {
  SubjectSelectionPanel,
  isValidSubject,
  type DetectedSubject,
} from "./subject-confirmation-dialog/subject-selection-panel";
import { MaestroSelectionPanel } from "./subject-confirmation-dialog/maestro-selection-panel";

interface SubjectConfirmationDialogProps {
  detectedSubject: DetectedSubject;
  isOpen: boolean;
  photoPreview?: string;
  onConfirm: (subject: Subject, maestro: Maestro | null) => void;
  onClose: () => void;
}

export function SubjectConfirmationDialog({
  detectedSubject,
  isOpen,
  photoPreview,
  onConfirm,
  onClose,
}: SubjectConfirmationDialogProps) {
  const t = useTranslations("education.subject-confirmation");
  const initialSubject = isValidSubject(detectedSubject)
    ? detectedSubject
    : "mathematics";
  const [selectedSubject, setSelectedSubject] =
    useState<Subject>(initialSubject);
  const [showMaestroSelection, setShowMaestroSelection] = useState(false);

  const handleSubjectConfirm = () => {
    setShowMaestroSelection(true);
  };

  const handleMaestroSelect = (maestro: Maestro | null) => {
    onConfirm(selectedSubject, maestro);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Photo preview */}
      {photoPreview && (
        <Card>
          <CardContent className="p-4">
            <div className="relative rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt={t("photoAlt")}
                className="w-full max-h-64 object-contain bg-slate-100 dark:bg-slate-800"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {showMaestroSelection ? (
              <>
                <GraduationCap className="h-5 w-5 text-blue-500" />
                {t("chooseProfessor")}
              </>
            ) : (
              <>
                <BookOpen className="h-5 w-5 text-blue-500" />
                {t("selectSubject")}
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showMaestroSelection ? (
            <SubjectSelectionPanel
              detectedSubject={detectedSubject}
              selectedSubject={selectedSubject}
              onSelectSubject={setSelectedSubject}
              onConfirm={handleSubjectConfirm}
              onClose={onClose}
            />
          ) : (
            <MaestroSelectionPanel
              selectedSubject={selectedSubject}
              onSelectMaestro={handleMaestroSelect}
              onBack={() => setShowMaestroSelection(false)}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export type { DetectedSubject };
