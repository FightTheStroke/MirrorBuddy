"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { createWPMCalculator } from "@/lib/typing/wpm-calculator";
import { cn } from "@/lib/utils";

const GAME_WORDS = [
  "velocita",
  "tempo",
  "veloce",
  "corsa",
  "scatto",
  "rapido",
  "sprint",
  "lampo",
  "turbo",
  "record",
  "meta",
  "arrivo",
  "pronto",
  "partenza",
  "finale",
  "gara",
  "competizione",
];

interface SpeedGameProps {
  onGameEnd: (score: number, wpm: number) => void;
}

export function SpeedGame({ onGameEnd }: SpeedGameProps) {
  const t = useTranslations("tools.typing.speedGame");
  const [words] = useState<string[]>(() =>
    shuffle([...GAME_WORDS]).slice(0, 10),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const wpmCalc = createWPMCalculator();

  useEffect(() => {
    if (isPlaying && currentIndex < words.length) {
      inputRef.current?.focus();
    }
  }, [currentIndex, isPlaying, words.length]);

  const endGame = () => {
    setIsPlaying(false);
    wpmCalc.finish();
    const wpm = wpmCalc.getWPM();
    setScore((currentScore) => {
      onGameEnd(currentScore, wpm);
      return currentScore;
    });
  };

  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;

    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [isPlaying, timeLeft]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTypedText(value);

    if (value === words[currentIndex]) {
      setScore((prev) => prev + 10);
      setTypedText("");
      wpmCalc.recordKeystroke(true);

      setCurrentIndex((prevIndex) => {
        if (prevIndex >= words.length - 1) {
          endGame();
        }
        return prevIndex + 1;
      });
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setCurrentIndex(0);
    setScore(0);
    setTypedText("");
    setTimeLeft(60);
    wpmCalc.reset();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Speed Game</h3>
        <div className="text-2xl font-bold text-primary">{timeLeft}s</div>
      </div>

      <p className="text-sm text-muted-foreground">{t("instructions")}</p>

      {!isPlaying ? (
        <button
          onClick={startGame}
          className="w-full py-4 bg-primary text-primary-foreground rounded-lg text-lg font-semibold hover:bg-primary/90"
        >
          {t("startButton")}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="text-sm text-muted-foreground">
                {t("scoreLabel")}
              </div>
              <div className="text-2xl font-bold">{score}</div>
            </div>
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="text-sm text-muted-foreground">
                {t("wordsLabel")}
              </div>
              <div className="text-2xl font-bold">
                {currentIndex}/{words.length}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {words.map((word, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 border rounded-lg text-center text-lg",
                  index === currentIndex
                    ? "bg-primary/20 border-primary"
                    : index < currentIndex
                      ? "bg-green-500/10 border-green-500/30 opacity-50"
                      : "bg-muted/30 border-border",
                )}
              >
                {index === currentIndex ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={typedText}
                    onChange={handleInput}
                    className="w-full bg-transparent text-center focus:outline-none"
                    placeholder={word}
                  />
                ) : (
                  word
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
