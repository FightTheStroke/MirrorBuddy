"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  MessageSquare,
  PlusCircle,
  Sparkles,
  Upload,
  Network,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ToolMaestroSelectionDialog } from "./tool-maestro-selection-dialog";
import type { Maestro } from "@/types";
import { useMindmapsView } from "./mindmaps-view/hooks/use-mindmaps-view";
import { MindmapsGrid } from "./mindmaps-view/components/mindmaps-grid";
import { ViewMindmapModal } from "./mindmaps-view/components/view-mindmap-modal";
import { ExamplesModal } from "./mindmaps-view/components/examples-modal";
import { CreateMindmapModal } from "./mindmaps-view/components/create-mindmap-modal";

interface MindmapsViewProps {
  className?: string;
  initialMaestroId?: string | null;
  initialMode?: "voice" | "chat" | null;
}

export function MindmapsView({
  className,
  initialMaestroId,
  initialMode,
}: MindmapsViewProps) {
  const t = useTranslations("education.mindmaps");
  const [showMaestroDialog, setShowMaestroDialog] = useState(false);
  const initialProcessed = useRef(false);

  useEffect(() => {
    if (initialMaestroId && initialMode && !initialProcessed.current) {
      initialProcessed.current = true;
      const timer = setTimeout(() => {
        setShowMaestroDialog(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialMaestroId, initialMode]);

  const {
    mindmaps,
    loading,
    selectedMindmap,
    setSelectedMindmap,
    showExamples,
    setShowExamples,
    selectedExample,
    setSelectedExample,
    showCreateModal,
    setShowCreateModal,
    newMapTitle,
    setNewMapTitle,
    newMapSubject,
    setNewMapSubject,
    newMapTopics,
    setNewMapTopics,
    handleDeleteMindmap,
    saveExampleAsMindmap,
    handleCreateMindmap,
    handleExport,
    handleImport,
  } = useMindmapsView();

  const handleMaestroConfirm = useCallback(
    (_maestro: Maestro, _mode: "voice" | "chat") => {
      setShowMaestroDialog(false);
      // Focus mode has been removed, close dialog only
    },
    [],
  );

  const handleInitialMaestroConfirm = useCallback(() => {
    setShowMaestroDialog(false);
    // Focus mode has been removed
  }, []);

  const addTopic = () => {
    setNewMapTopics([...newMapTopics, { name: "", subtopics: [""] }]);
  };

  const updateTopicName = (index: number, name: string) => {
    const updated = [...newMapTopics];
    updated[index].name = name;
    setNewMapTopics(updated);
  };

  const addSubtopic = (topicIndex: number) => {
    const updated = [...newMapTopics];
    updated[topicIndex].subtopics.push("");
    setNewMapTopics(updated);
  };

  const updateSubtopic = (
    topicIndex: number,
    subtopicIndex: number,
    value: string,
  ) => {
    const updated = [...newMapTopics];
    updated[topicIndex].subtopics[subtopicIndex] = value;
    setNewMapTopics(updated);
  };

  const removeTopic = (index: number) => {
    if (newMapTopics.length > 1) {
      setNewMapTopics(newMapTopics.filter((_, i) => i !== index));
    }
  };

  const removeSubtopic = (topicIndex: number, subtopicIndex: number) => {
    const updated = [...newMapTopics];
    if (updated[topicIndex].subtopics.length > 1) {
      updated[topicIndex].subtopics = updated[topicIndex].subtopics.filter(
        (_, i) => i !== subtopicIndex,
      );
      setNewMapTopics(updated);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowMaestroDialog(true)}>
            <MessageSquare className="w-4 h-4 mr-2" />
            {t("createWithProfessor")}
          </Button>
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            {t("manualMode")}
          </Button>
          <Button variant="outline" onClick={() => setShowExamples(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t("examples")}
          </Button>
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              {t("import")}
              <input
                type="file"
                accept=".json,.md,.markdown,.mm,.xmind,.txt"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-accent-themed/10">
              <Network className="w-6 h-6 text-accent-themed" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                {t("how")}
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {t("description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <MindmapsGrid
        mindmaps={mindmaps}
        loading={loading}
        onSelectMindmap={setSelectedMindmap}
        onDeleteMindmap={handleDeleteMindmap}
        onShowExamples={() => setShowExamples(true)}
      />

      <ViewMindmapModal
        mindmap={selectedMindmap}
        onClose={() => setSelectedMindmap(null)}
        onExport={handleExport}
      />

      <ExamplesModal
        isOpen={showExamples}
        selectedExample={selectedExample}
        onClose={() => setShowExamples(false)}
        onSelectExample={setSelectedExample}
        onBackToExamples={() => setSelectedExample(null)}
        onSaveExample={saveExampleAsMindmap}
      />

      <CreateMindmapModal
        isOpen={showCreateModal}
        title={newMapTitle}
        subject={newMapSubject}
        topics={newMapTopics}
        onClose={() => setShowCreateModal(false)}
        onTitleChange={setNewMapTitle}
        onSubjectChange={setNewMapSubject}
        onAddTopic={addTopic}
        onUpdateTopicName={updateTopicName}
        onRemoveTopic={removeTopic}
        onAddSubtopic={addSubtopic}
        onUpdateSubtopic={updateSubtopic}
        onRemoveSubtopic={removeSubtopic}
        onCreate={handleCreateMindmap}
      />

      <ToolMaestroSelectionDialog
        isOpen={showMaestroDialog}
        toolType="mindmap"
        onConfirm={
          initialMaestroId && initialMode
            ? handleInitialMaestroConfirm
            : handleMaestroConfirm
        }
        onClose={() => setShowMaestroDialog(false)}
      />
    </div>
  );
}
