'use client';

import { useState, useEffect } from 'react';
import { createWPMCalculator } from '@/lib/typing/wpm-calculator';
import { cn } from '@/lib/utils';

interface AccuracyGameProps {
  onGameEnd: (score: number, accuracy: number) => void;
}

export function AccuracyGame({ onGameEnd }: AccuracyGameProps) {
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);

  const GAME_SENTENCES = [
    'La gatta salta sul muro.',
    'Il cane corre nel parco.',
    'Mangiare una mela ogni giorno.',
    'Il sole splende luminoso.',
    'La penna scrive bene.',
  ];

  const wpmCalc = createWPMCalculator();

  useEffect(() => {
    setSentences(shuffle([...GAME_SENTENCES]).slice(0, 5));
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTypedText(value);

    if (value === sentences[currentIndex]) {
      setScore(score + 20);
      wpmCalc.recordKeystroke(true);
      setTypedText('');

      if (currentIndex >= sentences.length - 1) {
        endGame();
      } else {
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  const endGame = () => {
    setIsComplete(true);
    wpmCalc.finish();
    const accuracy = wpmCalc.getAccuracy();
    onGameEnd(score, accuracy);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold">Accuracy Game</h3>

      <p className="text-sm text-muted-foreground">
        Digita le frasi correttamente per guadagnare punti.
      </p>

      {isComplete ? (
        <div className="p-8 bg-primary/10 border border-primary/20 rounded-lg text-center">
          <h4 className="text-2xl font-bold mb-2">Gioco Completato!</h4>
          <p className="text-lg">Punteggio: {score}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Punti</span>
              <span className="text-2xl font-bold">{score}</span>
            </div>
          </div>

          <div className="space-y-3">
            {sentences.map((sentence, index) => (
              <div
                key={index}
                className={cn(
                  'p-4 border rounded-lg',
                  index === currentIndex
                    ? 'bg-primary/20 border-primary'
                    : index < currentIndex
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-muted/30 border-border'
                )}
              >
                {index === currentIndex ? (
                  <div className="space-y-2">
                    <p className="text-lg">{sentence}</p>
                    <input
                      type="text"
                      value={typedText}
                      onChange={handleInput}
                      autoFocus
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Digita la frase..."
                    />
                  </div>
                ) : (
                  <p className="text-lg">{sentence}</p>
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
