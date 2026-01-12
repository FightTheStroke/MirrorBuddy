'use client';

import { useCallback } from 'react';
import { Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { evaluate } from 'mathjs';
import { useCalculatorStore } from '@/lib/stores/calculator-store';
import { cn } from '@/lib/utils';

const BUTTONS = [
  ['C', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '='],
];

const OPERATOR_MAP: Record<string, string> = {
  '÷': '/',
  '×': '*',
  '±': 'negate',
};

export function CalculatorSimple() {
  const { display, expression, setDisplay, setExpression, addToHistory, clear } =
    useCalculatorStore();

  const handleButton = useCallback(
    (btn: string) => {
      if (btn === 'C') {
        clear();
        return;
      }

      if (btn === '⌫') {
        if (display.length > 1) {
          setDisplay(display.slice(0, -1));
        } else {
          setDisplay('0');
        }
        return;
      }

      if (btn === '±') {
        if (display !== '0') {
          setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
        }
        return;
      }

      if (btn === '%') {
        try {
          const result = evaluate(`${display} / 100`);
          setDisplay(String(result));
        } catch {
          setDisplay('Error');
        }
        return;
      }

      if (btn === '=') {
        try {
          const expr = expression + display;
          const result = evaluate(expr);
          const formatted = Number.isInteger(result) ? String(result) : result.toFixed(8).replace(/\.?0+$/, '');
          addToHistory(`${expr} = ${formatted}`);
          setDisplay(formatted);
          setExpression('');
        } catch {
          setDisplay('Error');
          setExpression('');
        }
        return;
      }

      if (['+', '-', '×', '÷'].includes(btn)) {
        const op = OPERATOR_MAP[btn] || btn;
        setExpression(expression + display + op);
        setDisplay('0');
        return;
      }

      // Number or decimal
      if (btn === '.' && display.includes('.')) return;
      if (display === '0' && btn !== '.') {
        setDisplay(btn);
      } else {
        setDisplay(display + btn);
      }
    },
    [display, expression, setDisplay, setExpression, addToHistory, clear]
  );

  const getButtonStyle = (btn: string) => {
    if (btn === '=') return 'bg-blue-500 hover:bg-blue-600 text-white';
    if (['+', '-', '×', '÷'].includes(btn)) return 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600';
    if (['C', '±', '%'].includes(btn)) return 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700';
    return 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800';
  };

  return (
    <div className="space-y-2">
      {/* Display */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-right">
        {expression && (
          <div className="text-xs text-slate-500 truncate">{expression}</div>
        )}
        <div className="text-2xl font-mono font-semibold text-slate-900 dark:text-white truncate">
          {display}
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {BUTTONS.flat().map((btn, idx) => (
          <Button
            key={idx}
            variant="ghost"
            onClick={() => handleButton(btn)}
            className={cn(
              'h-10 text-base font-medium rounded-lg border border-slate-200 dark:border-slate-700',
              getButtonStyle(btn),
              btn === '0' && 'col-span-1'
            )}
          >
            {btn === '⌫' ? <Delete className="w-4 h-4" /> : btn}
          </Button>
        ))}
      </div>
    </div>
  );
}
