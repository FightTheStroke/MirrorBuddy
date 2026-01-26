"use client";

/**
 * Voice Search Component
 * Mic button that activates coach in search mode
 * Interprets voice commands like "trova le mappe di matematica"
 * Updates filters automatically based on voice input
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface VoiceSearchProps {
  onSearchUpdate: (query: string) => void;
  onFilterUpdate: (filters: {
    type?: string;
    subject?: string;
    maestro?: string;
  }) => void;
}

export function VoiceSearch({
  onSearchUpdate,
  onFilterUpdate,
}: VoiceSearchProps) {
  const t = useTranslations("supporti");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleVoiceCommand = useCallback(
    async (command: string) => {
      setIsProcessing(true);
      const lowerCommand = command.toLowerCase();

      try {
        // Parse command for filters
        const filters: { type?: string; subject?: string; maestro?: string } =
          {};

        // Detect tool types
        if (lowerCommand.includes("mappa") || lowerCommand.includes("mappe")) {
          filters.type = "mindmap";
        } else if (lowerCommand.includes("quiz")) {
          filters.type = "quiz";
        } else if (lowerCommand.includes("flashcard")) {
          filters.type = "flashcard";
        } else if (
          lowerCommand.includes("demo") ||
          lowerCommand.includes("dimostrazione")
        ) {
          filters.type = "demo";
        } else if (
          lowerCommand.includes("riassunto") ||
          lowerCommand.includes("riassunti")
        ) {
          filters.type = "summary";
        }

        // Detect subjects
        if (lowerCommand.includes("matematica")) {
          filters.subject = "mathematics";
        } else if (lowerCommand.includes("fisica")) {
          filters.subject = "physics";
        } else if (lowerCommand.includes("chimica")) {
          filters.subject = "chemistry";
        } else if (lowerCommand.includes("biologia")) {
          filters.subject = "biology";
        } else if (lowerCommand.includes("storia")) {
          filters.subject = "history";
        } else if (lowerCommand.includes("geografia")) {
          filters.subject = "geography";
        } else if (lowerCommand.includes("italiano")) {
          filters.subject = "italian";
        } else if (lowerCommand.includes("inglese")) {
          filters.subject = "english";
        }

        // If filters were detected, apply them
        if (Object.keys(filters).length > 0) {
          onFilterUpdate(filters);
        } else {
          // Otherwise, use as search query
          onSearchUpdate(command);
        }

        logger.info("Voice command processed", { command, filters });
      } catch (error) {
        logger.error("Failed to process voice command", { command }, error);
      } finally {
        setIsProcessing(false);
      }
    },
    [onFilterUpdate, onSearchUpdate],
  );

  useEffect(() => {
    // Initialize Speech Recognition if available
    if (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      const SpeechRecognitionClass =
        (
          window as typeof window & {
            SpeechRecognition?: new () => SpeechRecognition;
            webkitSpeechRecognition?: new () => SpeechRecognition;
          }
        ).SpeechRecognition ||
        (
          window as typeof window & {
            webkitSpeechRecognition?: new () => SpeechRecognition;
          }
        ).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "it-IT";

        recognition.onresult = (event) => {
          const result = event.results[0][0].transcript;
          setTranscript(result);
          handleVoiceCommand(result);
        };

        recognition.onerror = (event) => {
          logger.error("Speech recognition error", { errorCode: event.error });
          setIsListening(false);
          setIsProcessing(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [handleVoiceCommand]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      logger.warn("Speech recognition not available");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Check if speech recognition is available
  const isAvailable =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  if (!isAvailable) {
    return null; // Don't render if not available
  }

  return (
    <div className="relative">
      <Button
        variant={isListening ? "default" : "outline"}
        size="icon"
        onClick={toggleListening}
        disabled={isProcessing}
        className={cn(
          "relative",
          isListening && "bg-red-500 hover:bg-red-600 animate-pulse",
        )}
        aria-label={
          isListening ? t("voiceSearch.stop") : t("voiceSearch.start")
        }
        aria-pressed={isListening}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </Button>

      {/* Transcript feedback */}
      {transcript && (
        <div className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-sm whitespace-nowrap">
          <p className="text-slate-600 dark:text-slate-400">
            &quot;{transcript}&quot;
          </p>
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div className="absolute -top-1 -right-1">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        </div>
      )}
    </div>
  );
}

// TypeScript type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: {
    length: number;
    [index: number]: {
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}
