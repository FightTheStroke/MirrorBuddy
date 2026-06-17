'use client';

// ============================================================================
// PARENTAL GATE DIALOG (Issue #432)
// Child-resistant gate shown before adult areas ("Per i grandi").
// - When a parent PIN is configured: requires the PIN.
// - Otherwise: a simple math challenge (zero-setup, covers trial users) plus
//   an optional "protect with a PIN" affordance.
// Accessibility: built on the Radix <Dialog> (focus trap, aria-modal, Esc).
// ============================================================================

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useParentalGateStore } from '@/lib/stores/parental-gate-store';

interface ParentalGateDialogProps {
  open: boolean;
  onUnlock: () => void;
  onCancel: () => void;
}

// Non-security UI challenge: a young child should not solve it, but it does not
// need cryptographic randomness.
function makeChallenge(): { a: number; b: number } {
  return { a: 2 + Math.floor(Math.random() * 8), b: 2 + Math.floor(Math.random() * 8) };
}

export function ParentalGateDialog({ open, onUnlock, onCancel }: ParentalGateDialogProps) {
  const t = useTranslations('home.parentalGate');
  const { isPinSet, isLoading, fetchStatus, verifyPin, setPin, unlock } = useParentalGateStore();

  const [challenge, setChallenge] = useState(makeChallenge);
  const [answer, setAnswer] = useState('');
  const [pin, setPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [showSetup, setShowSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [setupMessage, setSetupMessage] = useState<string | null>(null);

  // The parent remounts this dialog (via `key`) each time it opens, so local
  // state always starts fresh; here we only (re)load the server PIN status.
  useEffect(() => {
    if (open) void fetchStatus();
  }, [open, fetchStatus]);

  const handleMathSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (Number(answer) === challenge.a + challenge.b) {
      unlock();
      onUnlock();
    } else {
      setError(t('wrongAnswer'));
      setChallenge(makeChallenge());
      setAnswer('');
    }
  };

  const handlePinSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const ok = await verifyPin(pin);
    if (ok) {
      onUnlock();
    } else {
      setError(t('wrongPin'));
      setPinInput('');
    }
  };

  const handleSetupSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{4,6}$/.test(newPin)) {
      setSetupMessage(t('pinInvalid'));
      return;
    }
    if (newPin !== confirmPin) {
      setSetupMessage(t('pinMismatch'));
      return;
    }
    const ok = await setPin(newPin);
    setSetupMessage(ok ? t('pinSaved') : t('wrongPin'));
    if (ok) setShowSetup(false);
  };

  const onOpenChange = (next: boolean) => {
    if (!next) onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500" aria-hidden="true" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {isPinSet === null || isLoading ? (
          <p className="py-4 text-sm text-slate-600 dark:text-slate-400">{t('loading')}</p>
        ) : isPinSet ? (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label htmlFor="parental-pin" className="text-sm font-medium">
                {t('pinPrompt')}
              </label>
              <Input
                id="parental-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder={t('pinPlaceholder')}
                aria-describedby={error ? 'parental-gate-error' : undefined}
                autoFocus
              />
            </div>
            {error && (
              <p id="parental-gate-error" role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onCancel}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {t('unlock')}
              </Button>
            </DialogFooter>
          </form>
        ) : showSetup ? (
          <form onSubmit={handleSetupSubmit} className="space-y-4">
            <div>
              <label htmlFor="parental-new-pin" className="text-sm font-medium">
                {t('newPin')}
              </label>
              <Input
                id="parental-new-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder={t('pinPlaceholder')}
                autoFocus
              />
              <p className="mt-1 text-xs text-slate-500">{t('setPinHint')}</p>
            </div>
            <div>
              <label htmlFor="parental-confirm-pin" className="text-sm font-medium">
                {t('confirmPin')}
              </label>
              <Input
                id="parental-confirm-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder={t('pinPlaceholder')}
              />
            </div>
            {setupMessage && (
              <p role="alert" className="text-sm text-slate-700 dark:text-slate-300">
                {setupMessage}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setShowSetup(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleMathSubmit} className="space-y-4">
            <div>
              <label htmlFor="parental-math" className="text-sm font-medium">
                {t('mathPrompt', { a: challenge.a, b: challenge.b })}
              </label>
              <Input
                id="parental-math"
                type="number"
                inputMode="numeric"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={t('mathPlaceholder')}
                aria-describedby={error ? 'parental-gate-error' : undefined}
                autoFocus
              />
            </div>
            {error && (
              <p id="parental-gate-error" role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowSetup(true)}
              className="text-sm text-indigo-600 underline dark:text-indigo-400"
            >
              {t('setPinCta')}
            </button>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onCancel}>
                {t('cancel')}
              </Button>
              <Button type="submit">{t('unlock')}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
