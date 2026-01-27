"use client";

/**
 * TypingView Component
 * Inline view for Typing Tutor (no page wrapper)
 * Integrates with main app layout via Astuccio
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Keyboard, Trophy, Gamepad2, BookOpen } from "lucide-react";
import { useTypingStore } from "@/lib/stores";
import { LessonSelector } from "./lesson-selector";
import { VirtualKeyboard } from "./virtual-keyboard";
import { TypingInput } from "./typing-input";
import { FeedbackSystem, useFeedback } from "./feedback-system";
import { ProgressTracker } from "./progress-tracker";
import { GamesSelector } from "./games/games-selector";
import { SpeedGame } from "./games/speed-game";
import { AccuracyGame } from "./games/accuracy-game";
import { KeyboardExplorationGame } from "./games/keyboard-exploration-game";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TypingLesson, KeyboardLayout, TypingLevel } from "@/types/tools";
import type { KeyMappingResult } from "@/lib/typing/key-mapping-engine";

type ViewMode = "lessons" | "practice" | "games" | "progress";
type GameType = "speed" | "accuracy" | "exploration" | null;

export function TypingView() {
  const t = useTranslations("typing");

  const LEVEL_OPTIONS: { value: TypingLevel; label: string }[] = [
    { value: "beginner", label: t("beginner") },
    { value: "intermediate", label: t("intermediate") },
    { value: "advanced", label: t("advanced") },
  ];

  const LAYOUT_OPTIONS: { value: KeyboardLayout; label: string }[] = [
    { value: "qwertz", label: t("qwertz") },
    { value: "qwerty", label: t("qwerty") },
    { value: "azerty", label: t("azerty") },
    { value: "dvorak", label: t("dvorak") },
  ];

  const [viewMode, setViewMode] = useState<ViewMode>("lessons");
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [currentLesson, setCurrentLesson] = useState<TypingLesson | null>(null);
  const [expectedKey, setExpectedKey] = useState<string | undefined>();
  const [pressedKey, setPressedKey] = useState<string | undefined>();

  const { feedback, showFeedback, clearFeedback } = useFeedback();

  const {
    currentLayout,
    currentHandMode,
    currentLevel,
    setKeyboardLayout,
    setCurrentLevel,
    saveProgress,
    resetSession,
  } = useTypingStore();

  const handleLessonSelect = useCallback(
    (lesson: TypingLesson) => {
      setCurrentLesson(lesson);
      setViewMode("practice");
      clearFeedback();
    },
    [clearFeedback],
  );

  const handleKeystroke = useCallback(
    (result: KeyMappingResult) => {
      showFeedback(result);
      setExpectedKey(result.expected);
      setPressedKey(result.actual || undefined);

      // Clear pressed key after animation
      setTimeout(() => setPressedKey(undefined), 150);
    },
    [showFeedback],
  );

  const handleLessonComplete = useCallback(() => {
    saveProgress();
    setCurrentLesson(null);
    setViewMode("lessons");
  }, [saveProgress]);

  const handleGameSelect = useCallback(
    (game: "speed" | "accuracy" | "exploration") => {
      setActiveGame(game);
    },
    [],
  );

  const handleBackToLessons = useCallback(() => {
    resetSession();
    setCurrentLesson(null);
    setViewMode("lessons");
  }, [resetSession]);

  const handleSpeedGameEnd = useCallback((_score: number, _wpm: number) => {
    setActiveGame(null);
  }, []);

  const handleAccuracyGameEnd = useCallback(
    (_score: number, _accuracy: number) => {
      setActiveGame(null);
    },
    [],
  );

  const handleExplorationGameEnd = useCallback((_score: number) => {
    setActiveGame(null);
  }, []);

  const renderContent = () => {
    // Show active game
    if (activeGame === "speed") {
      return (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setActiveGame(null)}
            className="mb-2"
          >
            ← {t("backToGames")}
          </Button>
          <SpeedGame onGameEnd={handleSpeedGameEnd} />
        </div>
      );
    }
    if (activeGame === "accuracy") {
      return (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setActiveGame(null)}
            className="mb-2"
          >
            ← {t("backToGames")}
          </Button>
          <AccuracyGame onGameEnd={handleAccuracyGameEnd} />
        </div>
      );
    }
    if (activeGame === "exploration") {
      return (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setActiveGame(null)}
            className="mb-2"
          >
            ← {t("backToGames")}
          </Button>
          <KeyboardExplorationGame
            layout={currentLayout}
            onGameEnd={handleExplorationGameEnd}
          />
        </div>
      );
    }

    switch (viewMode) {
      case "practice":
        if (!currentLesson) return null;
        return (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={handleBackToLessons}
              className="mb-2"
            >
              ← {t("backToLessons")}
            </Button>

            <div className="p-6 bg-muted/30 rounded-xl">
              <h2 className="text-xl font-semibold mb-2">
                {currentLesson.title}
              </h2>
              <p className="text-muted-foreground mb-4">
                {currentLesson.description}
              </p>

              <div className="p-4 bg-card rounded-lg border mb-4">
                <p className="text-lg font-mono tracking-wide">
                  {currentLesson.text}
                </p>
              </div>

              <TypingInput
                lesson={currentLesson}
                isActive={true}
                onKeystroke={handleKeystroke}
                onComplete={handleLessonComplete}
              />
            </div>

            <FeedbackSystem result={feedback} />

            <VirtualKeyboard
              layout={currentLayout}
              handMode={currentHandMode}
              expectedKey={expectedKey}
              pressedKey={pressedKey}
            />
          </div>
        );

      case "games":
        return (
          <GamesSelector
            layout={currentLayout}
            onSelectGame={handleGameSelect}
          />
        );

      case "progress":
        return <ProgressTracker />;

      case "lessons":
      default:
        return (
          <div className="space-y-6">
            {/* Level and Layout selectors */}
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("level")}
                </label>
                <select
                  value={currentLevel}
                  onChange={(e) =>
                    setCurrentLevel(e.target.value as TypingLevel)
                  }
                  className="px-3 py-2 border rounded-lg bg-card"
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("keyboardLayout")}
                </label>
                <select
                  value={currentLayout}
                  onChange={(e) =>
                    setKeyboardLayout(e.target.value as KeyboardLayout)
                  }
                  className="px-3 py-2 border rounded-lg bg-card"
                >
                  {LAYOUT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <LessonSelector
              selectedLevel={currentLevel}
              currentLessonId={currentLesson?.id}
              onSelectLesson={handleLessonSelect}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Keyboard className="w-7 h-7 text-primary" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <NavTab
          active={viewMode === "lessons"}
          onClick={() => {
            setViewMode("lessons");
            setActiveGame(null);
          }}
          icon={BookOpen}
          label={t("lessons")}
        />
        <NavTab
          active={viewMode === "games"}
          onClick={() => {
            setViewMode("games");
            setActiveGame(null);
          }}
          icon={Gamepad2}
          label={t("games")}
        />
        <NavTab
          active={viewMode === "progress"}
          onClick={() => {
            setViewMode("progress");
            setActiveGame(null);
          }}
          icon={Trophy}
          label={t("progress")}
        />
      </div>

      {/* Content */}
      <div className="bg-card rounded-xl shadow-sm border p-6">
        {renderContent()}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InfoCard title={t("infoMultiLanguage")} desc={t("infoMultiLanguageDesc")} />
        <InfoCard title={t("infoOneHanded")} desc={t("infoOneHandedDesc")} />
        <InfoCard title={t("infoDSA")} desc={t("infoDSADesc")} />
        <InfoCard title={t("infoGamification")} desc={t("infoGamificationDesc")} />
      </div>
    </div>
  );
}

interface NavTabProps {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function NavTab({ active, onClick, icon: Icon, label }: NavTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary",
        active
          ? "bg-card border-b-2 border-primary text-primary font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-muted/50 border rounded-lg p-3">
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
