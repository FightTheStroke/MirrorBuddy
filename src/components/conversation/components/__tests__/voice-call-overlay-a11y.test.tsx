/**
 * Unit tests for VoiceCallOverlay accessibility toggle
 * Tests that the dot matrix visualizer switches to simple pulse
 * when accessibility profiles with reducedMotion are active.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const stripMotionProps = (props: Record<string, unknown>) => {
  const {
    whileHover: _whileHover,
    whileTap: _whileTap,
    initial: _initial,
    exit: _exit,
    transition: _transition,
    variants: _variants,
    layout: _layout,
    layoutId: _layoutId,
    drag: _drag,
    dragConstraints: _dragConstraints,
    dragElastic: _dragElastic,
    dragMomentum: _dragMomentum,
    ...rest
  } = props;
  return rest;
};

// Mock all external dependencies before importing the component

// Mock framer-motion - track motion.div usage for animation detection
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      animate,
      ...props
    }: React.PropsWithChildren<{ animate?: object }>) => {
      // Only mark as pulsing-wrapper if it has scale animation (the avatar pulse)
      const hasScaleAnimation =
        animate && typeof animate === "object" && "scale" in animate;
      return (
        <div
          data-testid={
            hasScaleAnimation ? "pulsing-avatar-wrapper" : "motion-div"
          }
          {...stripMotionProps(props as Record<string, unknown>)}
        >
          {children}
        </div>
      );
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Mic: () => <span data-testid="mic-icon" />,
  MicOff: () => <span data-testid="mic-off-icon" />,
  PhoneOff: () => <span data-testid="phone-off-icon" />,
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.PropsWithChildren<{ onClick?: () => void }>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | boolean | undefined)[]) =>
    args.filter(Boolean).join(" "),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/auth/csrf-client", () => ({
  csrfFetch: vi.fn(() => Promise.resolve({ ok: true, json: () => ({}) })),
}));

// Mock child components
vi.mock("../character-avatar", () => ({
  CharacterAvatar: ({ character }: { character: { name: string } }) => (
    <div data-testid="character-avatar">{character.name}</div>
  ),
}));

vi.mock("../character-role-badge", () => ({
  CharacterRoleBadge: () => <span data-testid="role-badge" />,
}));

vi.mock("../audio-device-selector", () => ({
  AudioDeviceSelector: () => <div data-testid="audio-device-selector" />,
}));

// Mock DotMatrixVisualizer
vi.mock("@/components/voice/waveform", () => ({
  DotMatrixVisualizer: () => <div data-testid="dot-matrix-visualizer" />,
}));

// Mock voice session hook
const mockVoiceSession = {
  isConnected: true,
  isListening: false,
  isSpeaking: true,
  isMuted: false,
  transcript: [],
  inputLevel: 0,
  outputAnalyser: null,
  connectionState: "connected",
  connect: vi.fn(),
  disconnect: vi.fn(),
  toggleMute: vi.fn(),
  sessionId: "test-session-id",
};

vi.mock("@/lib/hooks/use-voice-session", () => ({
  useVoiceSession: () => mockVoiceSession,
}));

vi.mock("../voice-call-helpers", () => ({
  getUserId: () => "test-user-id",
  activeCharacterToMaestro: (char: unknown) => char,
}));

// Mock accessibility store - this is the key for our tests
const mockShouldAnimate = vi.fn();

vi.mock("@/lib/accessibility", () => ({
  useAccessibilityStore: (
    selector: (state: { shouldAnimate: () => boolean }) => unknown,
  ) => selector({ shouldAnimate: mockShouldAnimate }),
}));

// Mock fetch for connection info (keep pending to avoid async state updates)
global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, "sessionStorage", { value: mockSessionStorage });

// Now import the component after all mocks are set up
import { VoiceCallOverlay } from "../voice-call-overlay";

const mockCharacter = {
  id: "euclide-matematica",
  name: "Euclide",
  type: "maestro" as const,
  color: "#22d3ee",
  character: {} as never, // Mocked - not used in tests
  greeting: "Ciao! Sono Euclide.",
  systemPrompt: "Test system prompt",
  voice: "sage",
  voiceInstructions: "Test voice instructions",
};

describe("VoiceCallOverlay Accessibility Toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  describe("when animations are enabled (standard users)", () => {
    beforeEach(() => {
      mockShouldAnimate.mockReturnValue(true);
    });

    it("shows the DotMatrixVisualizer", () => {
      render(<VoiceCallOverlay character={mockCharacter} onEnd={vi.fn()} />);
      expect(screen.getByTestId("dot-matrix-visualizer")).toBeInTheDocument();
    });

    it("shows static CharacterAvatar", () => {
      render(<VoiceCallOverlay character={mockCharacter} onEnd={vi.fn()} />);
      expect(screen.getByTestId("character-avatar")).toBeInTheDocument();
    });
  });

  describe("when animations are disabled (ADHD/Autism/etc profiles)", () => {
    beforeEach(() => {
      mockShouldAnimate.mockReturnValue(false);
    });

    it("hides the DotMatrixVisualizer", () => {
      render(<VoiceCallOverlay character={mockCharacter} onEnd={vi.fn()} />);
      expect(
        screen.queryByTestId("dot-matrix-visualizer"),
      ).not.toBeInTheDocument();
    });

    it("shows static CharacterAvatar without any animation", () => {
      render(<VoiceCallOverlay character={mockCharacter} onEnd={vi.fn()} />);
      expect(screen.getByTestId("character-avatar")).toBeInTheDocument();
      // Should NOT have any animation wrapper - respects prefers-reduced-motion
      expect(
        screen.queryByTestId("pulsing-avatar-wrapper"),
      ).not.toBeInTheDocument();
    });
  });

  describe("accessibility store integration", () => {
    it("calls shouldAnimate from accessibility store", () => {
      mockShouldAnimate.mockReturnValue(true);
      render(<VoiceCallOverlay character={mockCharacter} onEnd={vi.fn()} />);
      expect(mockShouldAnimate).toHaveBeenCalled();
    });

    it("respects reducedMotion setting from ADHD profile", () => {
      // ADHD profile sets reducedMotion: true, so shouldAnimate returns false
      mockShouldAnimate.mockReturnValue(false);
      render(<VoiceCallOverlay character={mockCharacter} onEnd={vi.fn()} />);
      expect(
        screen.queryByTestId("dot-matrix-visualizer"),
      ).not.toBeInTheDocument();
    });

    it("respects reducedMotion setting from Autism profile", () => {
      // Autism profile sets reducedMotion: true, so shouldAnimate returns false
      mockShouldAnimate.mockReturnValue(false);
      render(<VoiceCallOverlay character={mockCharacter} onEnd={vi.fn()} />);
      expect(
        screen.queryByTestId("dot-matrix-visualizer"),
      ).not.toBeInTheDocument();
    });
  });
});
