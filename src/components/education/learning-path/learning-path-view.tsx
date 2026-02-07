"use client";

/**
 * Learning Path View
 * Main view for displaying a learning path with topics
 * Plan 8 MVP - Wave 4: UI Integration [F-22]
 */

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { BookOpen, Clock, PlayCircle, ArrowLeft, Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";
import { csrfFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TopicCard } from "./components/topic-card";
import type { LearningPath, LearningPathTopic } from "@/types";

// Lazy load VisualOverview to avoid bundling mermaid (~300KB) in main chunk
const VisualOverview = dynamic(
  () => import("./visual-overview").then((m) => m.VisualOverview),
  {
    loading: () => (
      <div className="animate-pulse bg-slate-700/50 rounded-xl h-[250px]" />
    ),
    ssr: false,
  },
);

interface LearningPathViewProps {
  pathId: string;
  onBack?: () => void;
  onTopicSelect?: (topicId: string) => void;
  className?: string;
}

export function LearningPathView({
  pathId,
  onBack,
  onTopicSelect,
  className,
}: LearningPathViewProps) {
  const t = useTranslations("education.learningPath");
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPath = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/learning-path/${pathId}`);
        if (!response.ok) {
          throw new Error("Failed to load learning path");
        }
        const data = await response.json();
        setPath(data.path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    fetchPath();
  }, [pathId]);

  const handleTopicClick = (topic: LearningPathTopic) => {
    if (topic.status === "locked") return;
    onTopicSelect?.(topic.id);
  };

  const handleStartTopic = async (topicId: string) => {
    try {
      await csrfFetch(`/api/learning-path/${pathId}/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      // Refresh path data
      const response = await fetch(`/api/learning-path/${pathId}`);
      const data = await response.json();
      setPath(data.path);
      onTopicSelect?.(topicId);
    } catch (err) {
      logger.error("Failed to start topic", {
        topicId,
        pathId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">
          {t("loadingPath")}
        </span>
      </div>
    );
  }

  if (error || !path) {
    return (
      <div className={cn("text-center py-12", className)}>
        <p className="text-red-600 dark:text-red-400">
          {error || t("pathNotFound")}
        </p>
        {onBack && (
          <Button variant="outline" onClick={onBack} className="mt-4">
            {t("back")}
          </Button>
        )}
      </div>
    );
  }

  const currentTopic = path.topics.find(
    (t) => t.status === "in_progress" || t.status === "unlocked",
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-primary" />
              {path.title}
            </h1>
            {path.subject && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {path.subject}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <span>
                {path.topics.length} {t("topics")}
              </span>
              {path.estimatedTotalMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />~{path.estimatedTotalMinutes} min
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress summary */}
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">
            {path.progressPercent}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {path.completedTopics}/{path.totalTopics} {t("completedTopics")}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={path.progressPercent} className="h-3" />

      {/* Visual Overview */}
      <VisualOverview
        topics={path.topics}
        title={path.title}
        onTopicClick={(topicId) => {
          const topic = path.topics.find((t) => t.id === topicId);
          if (topic) handleTopicClick(topic);
        }}
      />

      {/* Continue button */}
      {currentTopic && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/20 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">
                {currentTopic.status === "in_progress"
                  ? t("continueWith")
                  : t("nextTopic")}
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                {currentTopic.title}
              </p>
            </div>
            <Button
              onClick={() => handleStartTopic(currentTopic.id)}
              className="gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              {currentTopic.status === "in_progress"
                ? t("continue")
                : t("start")}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Topics list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t("topicsHeader")}
        </h2>

        {path.topics
          .sort((a, b) => a.order - b.order)
          .map((topic, index) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              index={index + 1}
              onClick={() => handleTopicClick(topic)}
              onStart={() => handleStartTopic(topic.id)}
            />
          ))}
      </div>
    </div>
  );
}
