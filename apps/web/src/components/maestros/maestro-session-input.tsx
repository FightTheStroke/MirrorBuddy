"use client";

import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaestroSessionToolButtons } from "./maestro-session-tool-buttons";
import type { Maestro } from "@/types";
import { useTranslations } from "next-intl";

type ToolType =
  | "mindmap"
  | "quiz"
  | "flashcards"
  | "demo"
  | "search"
  | "summary"
  | "diagram"
  | "timeline";

interface MaestroSessionInputProps {
  maestro: Maestro;
  input: string;
  isLoading: boolean;
  sessionEnded: boolean;
  isVoiceActive: boolean;
  showEndSession: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSubmit: () => void;
  onRequestTool: (tool: ToolType) => void;
  onRequestPhoto: () => void;
  onEndSession: () => void;
}

export function MaestroSessionInput({
  maestro,
  input,
  isLoading,
  sessionEnded,
  isVoiceActive,
  showEndSession,
  inputRef,
  onInputChange,
  onKeyDown,
  onSubmit,
  onRequestTool,
  onRequestPhoto,
  onEndSession,
}: MaestroSessionInputProps) {
  const t = useTranslations("chat");
  // Hide toolbar if maestro has no tools or only internal tools like web_search
  const visibleTools = (maestro.tools || []).filter((t) => t !== "web_search");
  const hasVisibleTools = visibleTools.length > 0 || !maestro.tools;

  return (
    <div className="p-2 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-b-2xl">
      {/* Tool buttons - hidden for maestri with no visible tools */}
      {hasVisibleTools && (
        <MaestroSessionToolButtons
          isLoading={isLoading}
          sessionEnded={sessionEnded}
          onRequestTool={onRequestTool}
          onRequestPhoto={onRequestPhoto}
        />
      )}

      <div className="flex gap-2 sm:gap-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            sessionEnded
              ? 'Sessione terminata - Clicca "Nuova conversazione" per ricominciare'
              : isVoiceActive
                ? "Parla o scrivi..."
                : `Scrivi un messaggio a ${maestro.displayName}...`
          }
          className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 sm:px-4 py-2 sm:py-3 text-sm focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": maestro.color } as React.CSSProperties}
          rows={1}
          disabled={isLoading || sessionEnded}
        />
        <Button
          onClick={onSubmit}
          disabled={!input.trim() || isLoading || sessionEnded}
          style={{ backgroundColor: maestro.color }}
          className="hover:opacity-90 flex-shrink-0 h-9 sm:h-auto"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
          ) : (
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </Button>
      </div>

      {/* End session button */}
      {showEndSession && (
        <div className="flex justify-center mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onEndSession}
            className="text-slate-600"
          >
            {t("terminaSessioneEValuta")}
          </Button>
        </div>
      )}
    </div>
  );
}
