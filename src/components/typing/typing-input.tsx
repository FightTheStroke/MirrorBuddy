"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTypingStore } from "@/lib/stores";
import {
  createKeyMappingEngine,
  type KeyMappingResult,
} from "@/lib/typing/key-mapping-engine";
import type { TypingLesson } from "@/types/tools";

interface TypingInputProps {
  lesson: TypingLesson;
  isActive: boolean;
  onKeystroke?: (result: KeyMappingResult) => void;
  onComplete?: () => void;
  onError?: () => void;
  disabled?: boolean;
}

export function TypingInput({
  lesson,
  isActive,
  onKeystroke,
  onComplete,
  onError,
  disabled = false,
}: TypingInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<ReturnType<typeof createKeyMappingEngine> | null>(
    null,
  );
  const focusTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const {
    currentLesson: _currentLesson,
    startLesson,
    endLesson: _endLesson,
    recordKeystroke,
  } = useTypingStore();

  useEffect(() => {
    if (isActive && !disabled) {
      engineRef.current = createKeyMappingEngine(lesson.text);
      startLesson(lesson);

      focusTimeoutRef.current = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () => {
        if (focusTimeoutRef.current) {
          clearTimeout(focusTimeoutRef.current);
        }
      };
    }
  }, [isActive, lesson, startLesson, disabled]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive || disabled || !engineRef.current) return;

      event.preventDefault();

      const mappedKey = engineRef.current.mapKey(event);
      if (!mappedKey) return;

      const result = engineRef.current.validateKey(mappedKey);
      recordKeystroke(mappedKey, result.expected);

      if (onKeystroke) {
        onKeystroke(result);
      }

      if (!result.correct && !result.isBackspace) {
        onError?.();
      }

      if (engineRef.current.isComplete()) {
        onComplete?.();
      }
    },
    [isActive, disabled, recordKeystroke, onKeystroke, onComplete, onError],
  );

  useEffect(() => {
    if (!isActive || disabled) return;

    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      handleKeyDown(e);
    };

    window.addEventListener("keydown", handleKeyDownGlobal);
    inputRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDownGlobal);
    };
  }, [isActive, disabled, handleKeyDown]);

  const handleClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  if (!isActive) {
    return null;
  }

  return (
    <div
      className="relative"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      role="textbox"
      tabIndex={0}
      aria-label="Typing input area"
    >
      <input
        ref={inputRef}
        type="text"
        className="sr-only"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}
