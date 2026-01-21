'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { KeyboardLayout, TypingHandMode } from '@/types/tools';

interface VirtualKeyboardProps {
  layout: KeyboardLayout;
  handMode: TypingHandMode;
  expectedKey?: string;
  pressedKey?: string;
  onKeyClick?: (key: string) => void;
  highlightFingers?: boolean;
  disabled?: boolean;
}

const KEYBOARD_LAYOUTS: Record<KeyboardLayout, string[][]> = {
  qwertz: [
    ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü', '+'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä', '#'],
    ['<', 'y', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-'],
  ],
  qwerty: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  ],
  azerty: [
    ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '^', '$'],
    ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'ù'],
    ['w', 'x', 'c', 'v', 'b', 'n', ',', ';', ':', '!'],
  ],
  dvorak: [
    ["'", ',', '.', 'p', 'y', 'f', 'g', 'c', 'r', 'l', '/', '='],
    ['a', 'o', 'e', 'u', 'i', 'd', 'h', 't', 'n', 's', '-'],
    [';', 'q', 'j', 'k', 'x', 'b', 'm', 'w', 'v', 'z'],
  ],
};

const HAND_ASSIGNMENTS: Record<string, 'left' | 'right'> = {
  q: 'left', w: 'left', e: 'left', r: 'left', t: 'left', y: 'right', u: 'right', i: 'right', o: 'right', p: 'right',
  a: 'left', s: 'left', d: 'left', f: 'left', g: 'left', h: 'right', j: 'right', k: 'right', l: 'right', ';': 'right', "'": 'right',
  z: 'left', x: 'left', c: 'left', v: 'left', b: 'right', n: 'right', m: 'right', ',': 'right', '.': 'right', '/': 'right',
};

export function VirtualKeyboard({
  layout,
  handMode,
  expectedKey,
  pressedKey,
  onKeyClick,
  highlightFingers = false,
  disabled = false,
}: VirtualKeyboardProps) {
  const rows = KEYBOARD_LAYOUTS[layout];

  const getKeyState = (key: string) => {
    if (disabled) return 'disabled';
    if (pressedKey === key) return 'pressed';
    if (expectedKey === key) return 'expected';
    return 'default';
  };

  const shouldShowKey = (key: string) => {
    if (handMode === 'both') return true;
    const hand = HAND_ASSIGNMENTS[key.toLowerCase()];
    return (handMode === 'left-only' && hand === 'left') ||
           (handMode === 'right-only' && hand === 'right');
  };

  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-xl" role="application" aria-label="Virtual keyboard">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((key) => {
            const state = getKeyState(key);
            const show = shouldShowKey(key);

            if (!show) return null;

            return (
              <button
                key={key}
                onClick={() => !disabled && onKeyClick?.(key)}
                disabled={disabled}
                className={cn(
                  'w-10 h-10 sm:w-12 sm:h-12 rounded-lg font-semibold transition-all duration-100',
                  'border border-border focus:outline-none focus:ring-2 focus:ring-primary',
                  'flex items-center justify-center text-sm',
                  state === 'pressed' && 'bg-primary text-primary-foreground scale-95 shadow-lg',
                  state === 'expected' && 'bg-primary/20 border-primary ring-2 ring-primary/50',
                  state === 'default' && 'bg-card hover:bg-muted cursor-pointer',
                  state === 'disabled' && 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                )}
                aria-label={`Key ${key}`}
                aria-current={state === 'pressed' ? 'true' : undefined}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
