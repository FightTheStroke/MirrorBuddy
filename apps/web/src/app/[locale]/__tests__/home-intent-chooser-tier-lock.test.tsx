/**
 * HomeIntentChooser — tier-lock dialog regression coverage (TJ.10 verification)
 * @vitest-environment jsdom
 *
 * Context: a prior audit (TJ.10) flagged that hitting a tier-gated feature could
 * silently redirect with no explanation. Investigation found that surface
 * (this intent picker) already replaced the silent bounce with an explicit,
 * i18n'd, accessible "ask a grown-up" dialog (UX-03 dialog, home-intent-chooser.tsx),
 * but the dialog had ZERO test coverage. These tests lock that behavior in:
 *
 * - A Trial user (features.mindMaps / features.quizzes = false) tapping a
 *   gated intent card sees the explicit dialog — never a silent no-op/redirect.
 * - A user WITH the required tier feature passes straight through to the
 *   subject-picker step (no regression, no dialog).
 * - The dialog's i18n keys resolve to real, non-empty copy (not raw keys).
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTranslations } from 'next-intl';
import { HomeIntentChooser } from '../home-intent-chooser';
import { useTierFeatures } from '@/hooks/useTierFeatures';

// --- next-intl -----------------------------------------------------------
// Minimal real-ish translation table so assertions can check actual copy,
// not just that *a* string rendered.
const HOME_MESSAGES: Record<string, string> = {
  'intent.greeting': 'Ciao! Cosa facciamo oggi?',
  'intent.greetingNamed': 'Ciao {name}! Cosa facciamo oggi?',
  'intent.question': 'Scegli da dove partire: ci penso io a guidarti.',
  'intent.back': 'Indietro',
  'intent.lockedHint': 'Chiedi a un grande di aprirla',
  'intent.ttsCardLabel': 'Ascolta: {label}',
  'intent.subjectSubtitle': 'Scegli la materia: ti porto il professore giusto.',
  'intent.subjectAny': 'Non lo so / Un po di tutto',
  'intent.lockedDialog.title': 'Chiedi a un grande di aprirla',
  'intent.lockedDialog.body':
    'Questa attività è chiusa con un lucchetto. Chiama mamma, papà o la maestra: possono aprirla per te!',
  'intent.lockedDialog.listen': 'Ascolta',
  'intent.lockedDialog.gotIt': 'Ho capito',
  'intent.homework.title': 'Fare i compiti',
  'intent.homework.subtitle': 'Ti aiuto passo passo',
  'intent.homework.subjectTitle': 'Con cosa hai bisogno di aiuto?',
  'intent.homework.contextMessage': 'contesto compiti',
  'intent.study.title': 'Studiare',
  'intent.study.subtitle': 'Facciamo una mappa insieme',
  'intent.study.subjectTitle': 'Cosa vuoi studiare?',
  'intent.study.contextMessage': 'contesto studio',
  'intent.quizMe.title': 'Mettiti alla prova',
  'intent.quizMe.subtitle': 'Ti faccio io le domande',
  'intent.quizMe.subjectTitle': 'Su cosa ti metto alla prova?',
  'intent.quizMe.contextMessage': 'contesto quiz',
};

function fakeT(key: string, values?: Record<string, string | number>): string {
  const template = HOME_MESSAGES[key] ?? key;
  if (!values) return template;
  return Object.entries(values).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

vi.mock('next-intl', () => ({
  useTranslations: vi.fn(),
}));

// --- framer-motion (avoid animation/act warnings, matches existing pattern) --
vi.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
}));

// --- accessibility (TTS) --------------------------------------------------
const speak = vi.fn();
vi.mock('@/components/accessibility', () => ({
  useTTS: () => ({ speak, stop: vi.fn(), enabled: false }),
}));

// --- tier features ---------------------------------------------------------
vi.mock('@/hooks/useTierFeatures', () => ({
  useTierFeatures: vi.fn(),
}));

describe('HomeIntentChooser — tier-lock dialog (TJ.10 verification)', () => {
  const onStart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useTranslations as any).mockReturnValue(fakeT);
  });

  function setTier(features: Record<string, boolean>, isLoading = false) {
    (useTierFeatures as any).mockReturnValue({
      hasFeature: (key: string) => features[key] ?? false,
      isLoading,
      tier: 'trial',
      features,
      isSimulated: false,
    });
  }

  it('shows the explicit "ask a grown-up" dialog when a Trial user taps a gated intent (no silent redirect)', () => {
    setTier({ mindMaps: false, quizzes: false });
    render(<HomeIntentChooser onStart={onStart} />);

    // Dialog is not present before interaction.
    expect(screen.queryByTestId('intent-locked-dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('intent-card-study'));

    const dialog = screen.getByTestId('intent-locked-dialog');
    expect(dialog).toBeInTheDocument();
    const withinDialog = within(dialog);
    expect(withinDialog.getByText(HOME_MESSAGES['intent.lockedDialog.title'])).toBeInTheDocument();
    expect(withinDialog.getByText(HOME_MESSAGES['intent.lockedDialog.body'])).toBeInTheDocument();

    // No navigation/session-start happened — the app did not silently bounce
    // the user anywhere, it explained the gate in place.
    expect(onStart).not.toHaveBeenCalled();
  });

  it('marks the locked card as aria-disabled with a discoverable reason (not a hidden/dead control)', () => {
    setTier({ mindMaps: false, quizzes: false });
    render(<HomeIntentChooser onStart={onStart} />);

    const card = screen.getByTestId('intent-card-quizMe');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    const describedBy = card.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      HOME_MESSAGES['intent.lockedHint'],
    );
  });

  it('closes the dialog via the "Got it" button without starting a session', () => {
    setTier({ mindMaps: false, quizzes: false });
    render(<HomeIntentChooser onStart={onStart} />);

    fireEvent.click(screen.getByTestId('intent-card-study'));
    expect(screen.getByTestId('intent-locked-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('intent-locked-dialog-close'));
    expect(screen.queryByTestId('intent-locked-dialog')).not.toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('lets a user WITH the required tier feature pass straight through to the subject step (no regression)', () => {
    setTier({ mindMaps: true, quizzes: true });
    render(<HomeIntentChooser onStart={onStart} />);

    const card = screen.getByTestId('intent-card-study');
    expect(card).toHaveAttribute('aria-disabled', 'false');

    fireEvent.click(card);

    // No lock dialog — the click advances to the subject-picker step instead.
    expect(screen.queryByTestId('intent-locked-dialog')).not.toBeInTheDocument();
    expect(screen.getByText(HOME_MESSAGES['intent.study.subjectTitle'])).toBeInTheDocument();
  });

  it('always allows the always-on homework intent regardless of tier', () => {
    setTier({ mindMaps: false, quizzes: false });
    render(<HomeIntentChooser onStart={onStart} />);

    const card = screen.getByTestId('intent-card-homework');
    expect(card).toHaveAttribute('aria-disabled', 'false');

    fireEvent.click(card);
    expect(screen.queryByTestId('intent-locked-dialog')).not.toBeInTheDocument();
    expect(screen.getByText(HOME_MESSAGES['intent.homework.subjectTitle'])).toBeInTheDocument();
  });

  it('renders the mocked lockedDialog copy in the dialog (wiring sanity check)', () => {
    setTier({ mindMaps: false, quizzes: false });
    render(<HomeIntentChooser onStart={onStart} />);

    fireEvent.click(screen.getByTestId('intent-card-quizMe'));

    const dialog = screen.getByTestId('intent-locked-dialog');
    const withinDialog = within(dialog);
    for (const key of [
      'intent.lockedDialog.title',
      'intent.lockedDialog.body',
      'intent.lockedDialog.gotIt',
    ]) {
      expect(withinDialog.getByText(HOME_MESSAGES[key])).toBeInTheDocument();
    }
  });

  describe('i18n coverage — real message catalogs (not the test mock)', () => {
    // Task item 4c: "i18n keys exist and resolve". Reading the actual JSON
    // catalogs (rather than asserting against our own HOME_MESSAGES mock)
    // guards against a key existing in the mock but missing/empty for real —
    // `npm run i18n:check` already enforces cross-locale parity (7762/7762 x5),
    // this locks down that these SPECIFIC keys used by the dialog are present
    // and non-empty in every shipped locale.
    const LOCALES = ['it', 'en', 'fr', 'de', 'es'] as const;
    const DIALOG_KEYS = ['title', 'body', 'listen', 'gotIt'] as const;

    it.each(LOCALES)('messages/%s/home.json has non-empty intent.lockedDialog.*', async (locale) => {
      const messages = (await import(`../../../../messages/${locale}/home.json`)).default;
      const lockedDialog = messages?.home?.intent?.lockedDialog;
      expect(lockedDialog).toBeDefined();
      for (const key of DIALOG_KEYS) {
        expect(typeof lockedDialog[key]).toBe('string');
        expect(lockedDialog[key].trim().length).toBeGreaterThan(0);
      }
    });
  });
});
