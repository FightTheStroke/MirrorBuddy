/**
 * WCAG 2.2.1 (Timing Adjustable) coverage for the auto-dismissing toast.
 *
 * Focus-group personas (Marco, dyslexia, reads ~40-60 wpm; Davide, cerebral
 * palsy) cannot read a 5s toast before it vanishes. The countdown must PAUSE
 * while the toast is hovered or keyboard-focused so they can keep it on screen.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';
import { ToastContainer, toast } from '../toast';

afterEach(() => {
  toast.dismissAll();
});

describe('toast auto-dismiss (WCAG 2.2.1)', () => {
  it('auto-dismisses after its duration', async () => {
    render(<ToastContainer />);
    toast.info('Salvato', 'I tuoi compiti sono al sicuro', { duration: 200 });

    expect(await screen.findByText('Salvato')).toBeInTheDocument();
    await waitForElementToBeRemoved(() => screen.queryByText('Salvato'), { timeout: 2000 });
  });

  it('PAUSES the countdown while hovered, then resumes on mouse leave', async () => {
    render(<ToastContainer />);
    toast.info('Quiz finito', 'Hai risposto a tutte le domande', { duration: 200 });

    const title = await screen.findByText('Quiz finito');
    // The whole toast item is the hover target.
    const item = title.closest('div[class*="pointer-events-auto"]') as HTMLElement;
    fireEvent.mouseEnter(item);

    // Well past the 200ms duration — it must still be on screen because hovered.
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.queryByText('Quiz finito')).toBeInTheDocument();

    // Resume: leaving lets the remaining time elapse and dismiss it.
    fireEvent.mouseLeave(item);
    await waitForElementToBeRemoved(() => screen.queryByText('Quiz finito'), { timeout: 2000 });
  });

  it('keyboard focus also pauses the countdown (motor / keyboard users)', async () => {
    render(<ToastContainer />);
    toast.info('Nota', 'Messaggio importante', { duration: 200 });

    const title = await screen.findByText('Nota');
    const item = title.closest('div[class*="pointer-events-auto"]') as HTMLElement;
    fireEvent.focus(item);

    await new Promise((r) => setTimeout(r, 600));
    expect(screen.queryByText('Nota')).toBeInTheDocument();

    fireEvent.blur(item);
    await waitForElementToBeRemoved(() => screen.queryByText('Nota'), { timeout: 2000 });
  });

  it('a sticky toast (duration 0) is never auto-dismissed', async () => {
    render(<ToastContainer />);
    toast.custom({ type: 'warning', title: 'Resta qui', duration: 0 });

    expect(await screen.findByText('Resta qui')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 500));
    expect(screen.queryByText('Resta qui')).toBeInTheDocument();
  });
});
