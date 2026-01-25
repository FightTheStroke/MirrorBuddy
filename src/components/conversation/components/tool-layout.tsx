import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolPanel } from "@/components/tools/tool-panel";
import { CHARACTER_AVATARS } from "./index";
import type { ToolState } from "@/types/tools";
import type {
  ActiveCharacter,
  FlowMessage,
} from "@/lib/stores/conversation-flow-store";

interface ToolLayoutProps {
  activeTool: ToolState;
  activeCharacter: ActiveCharacter | null;
  messages: FlowMessage[];
  isLoading: boolean;
  isToolMinimized: boolean;
  voiceSessionId: string | null;
  onCloseTool: () => void;
  onToggleMinimize: () => void;
}

export function ToolLayout({
  activeTool,
  activeCharacter,
  messages,
  isLoading,
  isToolMinimized,
  voiceSessionId,
  onCloseTool,
  onToggleMinimize,
}: ToolLayoutProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-[7] overflow-auto border-b border-slate-200 dark:border-slate-700">
        <ToolPanel
          tool={activeTool}
          maestro={
            activeCharacter
              ? {
                  displayName: activeCharacter.name,
                  avatar:
                    CHARACTER_AVATARS[activeCharacter.id] ||
                    "/avatars/default.jpg",
                  color: activeCharacter.color,
                }
              : null
          }
          onClose={onCloseTool}
          isMinimized={isToolMinimized}
          onToggleMinimize={onToggleMinimize}
          embedded={true}
          sessionId={voiceSessionId}
        />
      </div>

      <div
        className="flex-[1.5] overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50"
        role="log"
        aria-live="polite"
        aria-label="Messaggi recenti"
      >
        {messages.slice(-3).map((message) => (
          <div
            key={message.id}
            className={cn(
              "text-xs py-1 px-2 rounded mb-1",
              message.role === "user"
                ? "bg-accent-themed/10 text-right"
                : "bg-slate-200 dark:bg-slate-700",
            )}
          >
            <span className="font-medium">
              {message.role === "user" ? "Tu" : activeCharacter?.name}:
            </span>{" "}
            {message.content.substring(0, 80)}
            {message.content.length > 80 && "..."}
          </div>
        ))}
        {isLoading && (
          <div className="text-xs py-1 px-2 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{activeCharacter?.name} sta pensando...</span>
          </div>
        )}
      </div>
    </div>
  );
}
