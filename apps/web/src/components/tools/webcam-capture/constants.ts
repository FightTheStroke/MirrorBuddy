/**
 * @file constants.ts
 * @brief Constants for webcam capture
 */

export type TimerOption = 0 | 3 | 5 | 10;

export const TIMER_OPTIONS: Array<{
  value: TimerOption;
  label: string;
  icon: string;
}> = [
  { value: 0, label: 'Subito', icon: '⚡' },
  { value: 3, label: '3s', icon: '3️⃣' },
  { value: 5, label: '5s', icon: '5️⃣' },
  { value: 10, label: '10s', icon: '🔟' },
];

export type ErrorType = 'permission' | 'unavailable' | 'timeout' | null;

