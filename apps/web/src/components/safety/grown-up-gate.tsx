'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { makeGrownUpChallenge, setGrownUpVerified } from '@/lib/safety';

interface GrownUpGateProps {
  open: boolean;
  /** Called when the grown-up answers correctly (session is marked verified). */
  onPass: () => void;
  /** Called when the child/user backs out (Escape, cancel, overlay). */
  onCancel: () => void;
}

/**
 * Child-resistant gate (COMP-01 / #431, #432) shown before surfaces that
 * collect a minor's data or expose the adult/account area. A grown-up solves a
 * small arithmetic challenge; a young child cannot. NOT verifiable parental
 * consent — see grown-up-gate-state.ts. Radix Dialog gives the focus trap +
 * Escape; the input autofocuses and the error is announced via role="alert".
 */
export function GrownUpGate({ open, onPass, onCancel }: GrownUpGateProps) {
  const t = useTranslations('common');
  const [challenge, setChallenge] = useState(makeGrownUpChallenge);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number.parseInt(value, 10) === challenge.answer) {
      setGrownUpVerified();
      setError(false);
      onPass();
    } else {
      setError(true);
      setChallenge(makeGrownUpChallenge());
      setValue('');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
    >
      <DialogContent data-testid="grown-up-gate" className="max-w-md text-center sm:rounded-2xl">
        <DialogHeader className="items-center text-center">
          <span className="text-5xl mb-2" aria-hidden="true">
            🔒
          </span>
          <DialogTitle className="text-center">{t('grownUpGate.title')}</DialogTitle>
          <DialogDescription className="text-center">{t('grownUpGate.body')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label
            htmlFor="grown-up-gate-answer"
            className="block text-lg font-semibold text-slate-900 dark:text-white"
          >
            {t('grownUpGate.question', { a: challenge.a, b: challenge.b })}
          </label>
          <input
            id="grown-up-gate-answer"
            data-testid="grown-up-gate-input"
            type="number"
            inputMode="numeric"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(false);
            }}
            aria-invalid={error}
            aria-describedby={error ? 'grown-up-gate-error' : undefined}
            className="w-full min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-center text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-themed"
          />
          {error && (
            <p
              id="grown-up-gate-error"
              role="alert"
              data-testid="grown-up-gate-error"
              className="text-sm font-medium text-red-700 dark:text-red-400"
            >
              {t('grownUpGate.wrong')}
            </p>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="submit"
              data-testid="grown-up-gate-submit"
              className="w-full min-h-[44px]"
            >
              {t('grownUpGate.submit')}
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="grown-up-gate-cancel"
              onClick={onCancel}
              className="w-full min-h-[44px]"
            >
              {t('grownUpGate.cancel')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
