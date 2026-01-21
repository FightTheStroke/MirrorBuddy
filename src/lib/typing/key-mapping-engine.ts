'use client';

import type { LessonKey } from '@/types/tools';

export interface KeyMappingResult {
  correct: boolean;
  expected: string;
  actual: string;
  isBackspace: boolean;
}

export interface ValidationState {
  currentIndex: number;
  correctKeystrokes: number;
  totalKeystrokes: number;
  errorPositions: number[];
}

export class KeyMappingEngine {
  private targetText: string;
  private validationState: ValidationState;
  private keystrokes: LessonKey[];

  constructor(targetText: string) {
    this.targetText = targetText;
    this.validationState = {
      currentIndex: 0,
      correctKeystrokes: 0,
      totalKeystrokes: 0,
      errorPositions: [],
    };
    this.keystrokes = [];
  }

  mapKey(event: KeyboardEvent): string {
    const key = event.key;

    if (key === 'Backspace') {
      return 'Backspace';
    }

    if (key.length === 1 && !event.ctrlKey && !event.metaKey) {
      return key;
    }

    return '';
  }

  validateKey(key: string): KeyMappingResult {
    const currentIndex = this.validationState.currentIndex;

    if (key === 'Backspace') {
      if (this.keystrokes.length > 0) {
        const lastKeystroke = this.keystrokes[this.keystrokes.length - 1];
        
        if (!lastKeystroke.correct && lastKeystroke.actual) {
          this.validationState.errorPositions = this.validationState.errorPositions.filter(
            pos => pos !== this.keystrokes.length - 1
          );
        }
        
        this.keystrokes.pop();
        this.validationState.currentIndex = Math.max(0, currentIndex - 1);
        this.validationState.totalKeystrokes--;
      }

      return {
        correct: true,
        expected: '',
        actual: key,
        isBackspace: true,
      };
    }

    if (currentIndex >= this.targetText.length) {
      return {
        correct: false,
        expected: '',
        actual: key,
        isBackspace: false,
      };
    }

    const expectedChar = this.targetText[currentIndex];
    const isCorrect = key.toLowerCase() === expectedChar.toLowerCase();

    const keystroke: LessonKey = {
      key: expectedChar,
      correct: isCorrect,
      expected: expectedChar,
      actual: key,
      timestamp: Date.now(),
    };

    this.keystrokes.push(keystroke);
    this.validationState.totalKeystrokes++;
    this.validationState.currentIndex++;

    if (isCorrect) {
      this.validationState.correctKeystrokes++;
    } else {
      this.validationState.errorPositions.push(this.keystrokes.length - 1);
    }

    return {
      correct: isCorrect,
      expected: expectedChar,
      actual: key,
      isBackspace: false,
    };
  }

  getValidationState(): ValidationState {
    return { ...this.validationState };
  }

  getKeystrokes(): LessonKey[] {
    return [...this.keystrokes];
  }

  getCurrentExpectedChar(): string | null {
    const { currentIndex } = this.validationState;
    if (currentIndex >= this.targetText.length) return null;
    return this.targetText[currentIndex];
  }

  getPreviousChar(): string | null {
    const { currentIndex } = this.validationState;
    if (currentIndex === 0) return null;
    return this.targetText[currentIndex - 1];
  }

  getNextChar(): string | null {
    const { currentIndex } = this.validationState;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= this.targetText.length) return null;
    return this.targetText[nextIndex];
  }

  isComplete(): boolean {
    return this.validationState.currentIndex >= this.targetText.length;
  }

  getAccuracy(): number {
    if (this.validationState.totalKeystrokes === 0) return 100;
    return Math.round(
      (this.validationState.correctKeystrokes / this.validationState.totalKeystrokes) * 100
    );
  }

  getErrorRate(): number {
    return 100 - this.getAccuracy();
  }

  reset(): void {
    this.validationState = {
      currentIndex: 0,
      correctKeystrokes: 0,
      totalKeystrokes: 0,
      errorPositions: [],
    };
    this.keystrokes = [];
  }

  jumpTo(position: number): void {
    this.validationState.currentIndex = Math.max(0, Math.min(position, this.targetText.length));
    this.keystrokes = this.keystrokes.slice(0, this.validationState.currentIndex);
  }
}

export function createKeyMappingEngine(targetText: string): KeyMappingEngine {
  return new KeyMappingEngine(targetText);
}
