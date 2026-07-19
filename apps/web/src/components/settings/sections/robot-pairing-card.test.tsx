/**
 * Unit tests for RobotPairingCard — Settings › Integrations.
 * Covers the explainer/buy affordances (visible to everyone, even without a
 * robot) and the pairing-code generation flow.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RobotPairingCard } from "./robot-pairing-card";

vi.mock("next-intl", () => ({
  // Identity translator: assert against the raw keys.
  useTranslations: () => (key: string) => key,
}));

const csrfFetch = vi.fn();
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, csrfFetch: (...args: unknown[]) => csrfFetch(...args) };
});

vi.mock("@/lib/logger/client", () => ({
  clientLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ devices: [] }),
  }) as unknown as typeof fetch;
});

describe("RobotPairingCard", () => {
  it("explains what the robot is and lists its features to everyone", async () => {
    render(<RobotPairingCard />);

    expect(screen.getByText("whatIsTitle")).toBeInTheDocument();
    expect(screen.getByText("whatIsBody")).toBeInTheDocument();
    for (const key of [
      "featureEyes",
      "featureVoice",
      "featureCamera",
      "featureMovement",
      "featureStop",
    ]) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
    await waitFor(() =>
      expect(screen.getByText("noRobots")).toBeInTheDocument(),
    );
  });

  it("offers a safe external buy link for people without a robot", () => {
    render(<RobotPairingCard />);

    const buy = screen.getByRole("link", { name: /buyCta/ });
    expect(buy).toHaveAttribute("href", "https://www.reachy-mini.org/buy.html");
    expect(buy).toHaveAttribute?.("target", "_blank");
    expect(buy).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("shows the three connection steps", () => {
    render(<RobotPairingCard />);
    expect(screen.getByText("step1")).toBeInTheDocument();
    expect(screen.getByText("step2")).toBeInTheDocument();
    expect(screen.getByText("step3")).toBeInTheDocument();
  });

  it("generates a pairing code on demand", async () => {
    csrfFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ code: "123456", expiresAt: new Date().toISOString() }),
    });
    render(<RobotPairingCard />);

    await userEvent.click(screen.getByText("generateCode"));

    await waitFor(() => expect(screen.getByText("123456")).toBeInTheDocument());
    expect(csrfFetch).toHaveBeenCalledWith(
      "/api/devices/pair-code",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
