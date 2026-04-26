'use client';

export interface WPMStats {
  wpm: number;
  accuracy: number;
  netWPM: number;
  grossWPM: number;
  timeElapsed: number;
  keystrokesPerMinute: number;
}

export interface WPMResult {
  stats: WPMStats;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  improvement: number;
  isPersonalBest: boolean;
}

export class WPMCalculator {
  private startTime: number;
  private endTime: number | null;
  private totalKeystrokes: number;
  private correctKeystrokes: number;
  private bestWPM: number;

  constructor(initialBestWPM: number = 0) {
    this.startTime = Date.now();
    this.endTime = null;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.bestWPM = initialBestWPM;
  }

  recordKeystroke(correct: boolean): void {
    this.totalKeystrokes++;
    if (correct) {
      this.correctKeystrokes++;
    }
  }

  getElapsedTime(): number {
    const end = this.endTime || Date.now();
    return (end - this.startTime) / 1000;
  }

  getAccuracy(): number {
    if (this.totalKeystrokes === 0) return 100;
    return Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100);
  }

  getGrossWPM(): number {
    const timeElapsed = this.getElapsedTime();
    if (timeElapsed === 0) return 0;
    const keystrokesPerSecond = this.totalKeystrokes / timeElapsed;
    return Math.round(keystrokesPerSecond * 60 / 5);
  }

  getNetWPM(): number {
    const timeElapsed = this.getElapsedTime();
    if (timeElapsed === 0) return 0;
    const netKeystrokes = this.correctKeystrokes - (this.totalKeystrokes - this.correctKeystrokes);
    const netKeystrokesPerSecond = Math.max(0, netKeystrokes) / timeElapsed;
    return Math.round(netKeystrokesPerSecond * 60 / 5);
  }

  getKeystrokesPerMinute(): number {
    const timeElapsed = this.getElapsedTime();
    if (timeElapsed === 0) return 0;
    return Math.round(this.totalKeystrokes / (timeElapsed / 60));
  }

  getWPM(): number {
    return this.getNetWPM();
  }

  getStats(): WPMStats {
    return {
      wpm: this.getWPM(),
      accuracy: this.getAccuracy(),
      netWPM: this.getNetWPM(),
      grossWPM: this.getGrossWPM(),
      timeElapsed: this.getElapsedTime(),
      keystrokesPerMinute: this.getKeystrokesPerMinute(),
    };
  }

  getGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    const accuracy = this.getAccuracy();
    const wpm = this.getWPM();

    if (accuracy >= 98 && wpm >= 60) return 'A';
    if (accuracy >= 95 && wpm >= 40) return 'B';
    if (accuracy >= 90 && wpm >= 30) return 'C';
    if (accuracy >= 80 && wpm >= 20) return 'D';
    return 'F';
  }

  getResult(previousWPM?: number): WPMResult {
    const stats = this.getStats();
    const grade = this.getGrade();
    const wpm = this.getWPM();
    const isPersonalBest = wpm > this.bestWPM;
    
    if (isPersonalBest) {
      this.bestWPM = wpm;
    }

    const improvement = previousWPM 
      ? ((wpm - previousWPM) / previousWPM) * 100 
      : 0;

    return {
      stats,
      grade,
      improvement,
      isPersonalBest,
    };
  }

  finish(): void {
    this.endTime = Date.now();
  }

  reset(): void {
    this.startTime = Date.now();
    this.endTime = null;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
  }

  getBestWPM(): number {
    return this.bestWPM;
  }
}

export function createWPMCalculator(initialBestWPM?: number): WPMCalculator {
  return new WPMCalculator(initialBestWPM);
}

export function calculateTypingSpeed(
  totalKeystrokes: number,
  correctKeystrokes: number,
  timeElapsedSeconds: number
): number {
  if (timeElapsedSeconds === 0) return 0;
  const netKeystrokes = correctKeystrokes - (totalKeystrokes - correctKeystrokes);
  const netKeystrokesPerSecond = Math.max(0, netKeystrokes) / timeElapsedSeconds;
  return Math.round(netKeystrokesPerSecond * 60 / 5);
}

export function calculateAccuracy(
  correctKeystrokes: number,
  totalKeystrokes: number
): number {
  if (totalKeystrokes === 0) return 100;
  return Math.round((correctKeystrokes / totalKeystrokes) * 100);
}
