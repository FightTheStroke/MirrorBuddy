/**
 * QuizBreakTimer — ADHD break reminder wired into the real quiz flow (T2.10)
 *
 * `useAccessibilityStore` already ships a full ADHD work/break session
 * engine (adhdSessionState, adhdConfig, tickADHDTimer, startADHDBreak...)
 * but nothing ever rendered it inside the actual quiz-taking UI. These
 * tests exercise the real Zustand store (no mocking of the store itself,
 * per repo convention: accessibility state lives in Zustand, never
 * localStorage) and assert the component:
 *  - renders nothing when the ADHD profile / break reminders are off,
 *  - starts a work session for other profiles too (no dialog while working),
 *  - shows a visible, keyboard-operable break dialog once the configured
 *    work duration elapses when ADHD + break reminders are on,
 *  - lets the student resume the quiz, which restarts a work session.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizBreakTimer } from "./quiz-break-timer";
import { useAccessibilityStore } from "@/lib/accessibility";

// Keep framer-motion inert in tests (no real animation timing).
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const {
        initial: _initial,
        animate: _animate,
        transition: _transition,
        ...rest
      } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

const initialStoreState = useAccessibilityStore.getState();

function resetStore() {
  useAccessibilityStore.setState(initialStoreState, true);
}

describe("QuizBreakTimer", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    resetStore();
    vi.useRealTimers();
  });

  it("renders nothing when the ADHD profile is not enabled", () => {
    useAccessibilityStore.getState().updateSettings({
      adhdMode: false,
      breakReminders: false,
    });

    render(<QuizBreakTimer />);

    expect(screen.queryByTestId("quiz-break-timer")).not.toBeInTheDocument();
    // Not enabled -> no work session should have been started either.
    expect(useAccessibilityStore.getState().adhdSessionState).toBe("idle");
  });

  it("renders nothing when adhdMode is on but breakReminders is off", () => {
    useAccessibilityStore.getState().updateSettings({
      adhdMode: true,
      breakReminders: false,
    });

    render(<QuizBreakTimer />);

    expect(screen.queryByTestId("quiz-break-timer")).not.toBeInTheDocument();
  });

  it("starts a working session but shows no dialog while the work duration has not elapsed", () => {
    useAccessibilityStore.getState().updateSettings({
      adhdMode: true,
      breakReminders: true,
    });
    useAccessibilityStore.getState().updateADHDConfig({ workDuration: 600 });

    render(<QuizBreakTimer />);

    expect(useAccessibilityStore.getState().adhdSessionState).toBe("working");
    expect(screen.queryByTestId("quiz-break-timer")).not.toBeInTheDocument();
  });

  it("shows a visible, labeled break dialog once the work duration elapses", async () => {
    vi.useFakeTimers();
    useAccessibilityStore.getState().updateSettings({
      adhdMode: true,
      breakReminders: true,
    });
    useAccessibilityStore.getState().updateADHDConfig({ workDuration: 2 });

    render(<QuizBreakTimer />);
    expect(useAccessibilityStore.getState().adhdSessionState).toBe("working");

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(useAccessibilityStore.getState().adhdSessionState).toBe(
      "breakTime",
    );
    const dialog = screen.getByTestId("quiz-break-timer");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("role", "alertdialog");
    expect(dialog).toHaveAttribute("aria-live", "assertive");
    expect(within(dialog).getByText("Pausa!")).toBeInTheDocument();
  });

  it("lets the student resume the quiz from the break dialog (keyboard-operable button)", async () => {
    vi.useFakeTimers();
    useAccessibilityStore.getState().updateSettings({
      adhdMode: true,
      breakReminders: true,
    });
    useAccessibilityStore.getState().updateADHDConfig({ workDuration: 1 });

    const { unmount } = render(<QuizBreakTimer />);
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("quiz-break-timer")).toBeInTheDocument();

    // Switch back to real timers for userEvent's own internals, but keep
    // the component's interval from leaking past this test by unmounting
    // it once we're done asserting (cleanup clears the pending interval).
    vi.useRealTimers();
    const user = userEvent.setup();
    const resumeButton = screen.getByRole("button", {
      name: "Riprendi il quiz",
    });
    await user.click(resumeButton);

    expect(useAccessibilityStore.getState().adhdSessionState).toBe("working");
    expect(screen.queryByTestId("quiz-break-timer")).not.toBeInTheDocument();
    unmount();
  });
});
