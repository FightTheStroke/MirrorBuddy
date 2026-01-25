"use client";

import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { getMaestriBySubject } from "@/data";
import type { Subject, Maestro } from "@/types";
import { getSubjectLabel } from "./subject-selection-panel";

interface MaestroSelectionPanelProps {
  selectedSubject: Subject;
  onSelectMaestro: (maestro: Maestro | null) => void;
  onBack: () => void;
}

export function MaestroSelectionPanel({
  selectedSubject,
  onSelectMaestro,
  onBack,
}: MaestroSelectionPanelProps) {
  const availableMaestri = getMaestriBySubject(selectedSubject);

  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Vuoi studiare{" "}
        <span className="font-semibold text-blue-600">
          {getSubjectLabel(selectedSubject)}
        </span>{" "}
        con un Professore? Ti guiderà passo dopo passo.
      </p>

      <div className="space-y-2 mb-6">
        {availableMaestri.map((maestro) => (
          <button
            key={maestro.id}
            onClick={() => onSelectMaestro(maestro)}
            className="w-full p-4 flex items-center gap-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-md flex-shrink-0">
              <Image
                src={maestro.avatar}
                alt={maestro.displayName}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-semibold">{maestro.displayName}</p>
              <p className="text-sm text-slate-500">{maestro.specialty}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-blue-500" />
          </button>
        ))}

        {/* Option to continue without Maestro */}
        <button
          onClick={() => onSelectMaestro(null)}
          className="w-full p-4 flex items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              Continua senza Maestro
            </p>
            <p className="text-sm text-slate-500">
              Usa i suggerimenti maieutici per risolvere da solo
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      <Button variant="outline" onClick={onBack} className="w-full">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Torna alla selezione materia
      </Button>
    </>
  );
}
