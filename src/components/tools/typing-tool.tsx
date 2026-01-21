"use client";

import { useEffect } from "react";
import { useTypingStore } from "@/lib/stores";

export interface TypingRequest {
  lessonId?: string;
  level?: "beginner" | "intermediate" | "advanced";
  message?: string;
}

export interface TypingResult {
  completed: boolean;
  wpm: number;
  accuracy: number;
  lessonId: string;
}

interface TypingToolProps {
  request: TypingRequest;
  onComplete?: (result: TypingResult) => void;
}

export function TypingTool({
  request,
  onComplete: _onComplete,
}: TypingToolProps) {
  const { progress, loadProgress } = useTypingStore();

  useEffect(() => {
    if (progress?.userId) {
      loadProgress(progress.userId);
    }
  }, [progress?.userId, loadProgress]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Impara a Digitare</h1>
        <p className="text-muted-foreground mb-6">
          Il tool &quot;Impara a Digitare&quot; è in fase di sviluppo.
        </p>

        {request.message && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-6">
            <p className="text-sm">{request.message}</p>
          </div>
        )}

        <div className="grid gap-4">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Caratteristiche</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Lezioni progressive (beginner, intermediate, advanced)</li>
              <li>
                Tastiera virtuale multi-lingua (QWERTY, AZERTY, QWERTZ, Dvorak)
              </li>
              <li>Modalità una sola mano (destra/sinistra)</li>
              <li>Accessibilità completa per 7 profili DSA</li>
              <li>Giochi divertenti per practice</li>
              <li>Tracking WPM e accuracy</li>
              <li>Integrazione con Maestri AI</li>
            </ul>
          </div>

          <div className="p-6 border rounded-lg bg-muted/50">
            <p className="text-sm">
              <strong>Lezione consigliata:</strong>{" "}
              {request.lessonId || "Nessuna"}
            </p>
            <p className="text-sm">
              <strong>Livello:</strong> {request.level || "beginner"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
