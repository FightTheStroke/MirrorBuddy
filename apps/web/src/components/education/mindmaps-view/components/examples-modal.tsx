/**
 * @file examples-modal.tsx
 * @brief Examples modal component
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MindmapRenderer } from "@/components/tools/markmap";
import { subjectNames, subjectIcons, subjectColors } from "@/data";
import type { Subject } from "@/types";
import { exampleMindmapsBySubject } from "../constants/example-mindmaps";
import type { MindmapNode } from "../types";

interface ExamplesModalProps {
  isOpen: boolean;
  selectedExample: {
    title: string;
    nodes: MindmapNode[];
    subject: string;
  } | null;
  onClose: () => void;
  onSelectExample: (example: {
    title: string;
    nodes: MindmapNode[];
    subject: string;
  }) => void;
  onBackToExamples: () => void;
  onSaveExample: (
    example: { title: string; nodes: MindmapNode[] },
    subject: string,
  ) => void;
}

export function ExamplesModal({
  isOpen,
  selectedExample,
  onClose,
  onSelectExample,
  onBackToExamples,
  onSaveExample,
}: ExamplesModalProps) {
  const t = useTranslations("education.mindmaps");
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold">{t("examplesTitle")}</h3>
              <button
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {selectedExample ? (
                <div className="space-y-4">
                  <Button variant="outline" onClick={onBackToExamples}>
                    {t("backToExamples")}
                  </Button>
                  <MindmapRenderer
                    title={selectedExample.title}
                    nodes={selectedExample.nodes}
                  />
                  <div className="flex justify-center">
                    <Button
                      onClick={() =>
                        onSaveExample(
                          {
                            title: selectedExample.title,
                            nodes: selectedExample.nodes,
                          },
                          selectedExample.subject,
                        )
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("saveToCollection")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(exampleMindmapsBySubject).map(
                    ([subject, example]) => (
                      <Card
                        key={subject}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => onSelectExample({ ...example, subject })}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{
                                backgroundColor: `${subjectColors[subject as Subject]}20`,
                              }}
                            >
                              {subjectIcons[subject as Subject]}
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {example.title}
                              </CardTitle>
                              <p className="text-xs text-slate-500">
                                {subjectNames[subject as Subject]}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-1.5">
                            {example.nodes.slice(0, 3).map((node, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              >
                                {node.label}
                              </span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ),
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
