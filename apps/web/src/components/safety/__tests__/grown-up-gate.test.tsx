/**
 * GrownUpGate (COMP-01 / #431, #432): a child-resistant arithmetic gate before
 * minor-PII / adult surfaces. Tests the pass/fail/cancel paths and the
 * session-verified side effect.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GrownUpGate } from '../grown-up-gate';
import { isGrownUpVerified } from '@/lib/safety';

beforeEach(() => {
  try {
    window.sessionStorage.clear();
  } catch {
    // ignore
  }
});

/** The rendered question is "... {a} + {b} ...": pull the two numbers back out. */
function answerFromQuestion(): number {
  const label = screen.getByText(/\d+\s*\+\s*\d+/);
  const [a, b] = (label.textContent ?? '').match(/\d+/g)!.map(Number);
  return a + b;
}

describe('GrownUpGate', () => {
  it('calls onPass and marks the session verified on the correct answer', () => {
    const onPass = vi.fn();
    render(<GrownUpGate open onPass={onPass} onCancel={vi.fn()} />);

    const answer = answerFromQuestion();
    fireEvent.change(screen.getByTestId('grown-up-gate-input'), {
      target: { value: String(answer) },
    });
    fireEvent.click(screen.getByTestId('grown-up-gate-submit'));

    expect(onPass).toHaveBeenCalledTimes(1);
    expect(isGrownUpVerified()).toBe(true);
  });

  it('shows an error and does NOT pass on a wrong answer', () => {
    const onPass = vi.fn();
    render(<GrownUpGate open onPass={onPass} onCancel={vi.fn()} />);

    const wrong = answerFromQuestion() + 1;
    fireEvent.change(screen.getByTestId('grown-up-gate-input'), {
      target: { value: String(wrong) },
    });
    fireEvent.click(screen.getByTestId('grown-up-gate-submit'));

    expect(onPass).not.toHaveBeenCalled();
    expect(isGrownUpVerified()).toBe(false);
    expect(screen.getByTestId('grown-up-gate-error')).toBeInTheDocument();
  });

  it('calls onCancel when the user backs out', () => {
    const onCancel = vi.fn();
    render(<GrownUpGate open onPass={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('grown-up-gate-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
