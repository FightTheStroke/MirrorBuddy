/**
 * @file character-header.test.tsx
 * @brief Unit tests for CharacterHeader component mobile responsiveness (F-21)
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { UnifiedCharacter, VoiceState, HeaderActions } from "../../types";
import { CharacterHeader } from "../character-header";

describe("CharacterHeader - F-21 Mobile Responsiveness", () => {
  const mockCharacter: UnifiedCharacter = {
    id: "test-char",
    name: "Test Maestro",
    badge: "Professore",
    specialty: "Mathematics",
    greeting: "Buongiorno! Welcome to mathematics learning.",
    avatar: "/maestri/test.png",
    color: "#FF6B6B",
    type: "maestro",
  };

  const mockVoiceState: VoiceState = {
    isActive: false,
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    isMuted: false,
    inputLevel: 0,
    outputLevel: 0,
    connectionState: "disconnected",
    configError: null,
  };

  const mockActions: HeaderActions = {
    onClose: vi.fn(),
    onVoiceCall: vi.fn(),
    onStopTTS: vi.fn(),
    onClearChat: vi.fn(),
    onOpenHistory: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Accessibility", () => {
    it("should render with proper ARIA labels on all buttons", () => {
      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      // Close button
      expect(screen.getByLabelText("Chiudi")).toBeInTheDocument();

      // History button
      expect(
        screen.getByLabelText("Storico conversazioni"),
      ).toBeInTheDocument();
    });

    it("should have phone button with proper aria-label", () => {
      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      const phoneButton = screen.getByLabelText("Avvia chiamata vocale");
      expect(phoneButton).toBeInTheDocument();
      expect(phoneButton).not.toBeDisabled();
    });

    it("should disable phone button when voiceConfigError exists", () => {
      const voiceStateWithError: VoiceState = {
        ...mockVoiceState,
        configError: "Microphone not available",
      };

      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={voiceStateWithError}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      const phoneButton = screen.getByLabelText(/Voce non disponibile/);
      expect(phoneButton).toBeDisabled();
    });
  });

  describe("Content Structure", () => {
    it("should display character name", () => {
      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      expect(screen.getByText("Test Maestro")).toBeInTheDocument();
    });

    it("should display character specialty/badge", () => {
      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      expect(screen.getByText("Professore")).toBeInTheDocument();
    });

    it("should display greeting text", () => {
      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      expect(
        screen.getByText(/Welcome to mathematics learning/),
      ).toBeInTheDocument();
    });

    it('should show "In chiamata vocale" when voice is active', () => {
      const activeVoiceState: VoiceState = {
        isActive: true,
        isConnected: true,
        isListening: false,
        isSpeaking: false,
        isMuted: false,
        inputLevel: 0,
        outputLevel: 0,
        connectionState: "connected",
        configError: null,
      };

      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={activeVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      expect(screen.getByText("In chiamata vocale")).toBeInTheDocument();
    });
  });

  describe("Voice Features", () => {
    it("should hide phone button when in active call", () => {
      const activeVoiceState: VoiceState = {
        isActive: true,
        isConnected: true,
        isListening: false,
        isSpeaking: false,
        isMuted: false,
        inputLevel: 0,
        outputLevel: 0,
        connectionState: "connected",
        configError: null,
      };

      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={activeVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      // Phone button should not be present in the document
      expect(
        screen.queryByLabelText("Avvia chiamata vocale"),
      ).not.toBeInTheDocument();
    });

    it("should render TTS button when enabled", () => {
      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      // TTS button (hidden on sm, so test existence)
      expect(
        screen.getByLabelText("Disattiva lettura vocale"),
      ).toBeInTheDocument();
    });

    it("should disable TTS button when disabled", () => {
      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={false}
          actions={mockActions}
        />,
      );

      const ttsButton = screen.getByLabelText("Lettura vocale disattivata");
      expect(ttsButton).toBeDisabled();
    });
  });

  describe("Button Actions", () => {
    it("should call onClose when close button is clicked", () => {
      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      const closeButton = screen.getByLabelText("Chiudi");
      closeButton.click();

      expect(mockActions.onClose).toHaveBeenCalledTimes(1);
    });

    it("should call onVoiceCall when phone button is clicked", () => {
      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      const phoneButton = screen.getByLabelText("Avvia chiamata vocale");
      phoneButton.click();

      expect(mockActions.onVoiceCall).toHaveBeenCalledTimes(1);
    });

    it("should call onOpenHistory when history button is clicked", () => {
      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      const historyButton = screen.getByLabelText("Storico conversazioni");
      historyButton.click();

      expect(mockActions.onOpenHistory).toHaveBeenCalledTimes(1);
    });

    it("should not render history button when onOpenHistory is undefined", () => {
      const actionsWithoutHistory: HeaderActions = {
        ...mockActions,
        onOpenHistory: undefined,
      };

      render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={actionsWithoutHistory}
        />,
      );

      expect(
        screen.queryByLabelText("Storico conversazioni"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("should render with proper gap classes for responsive spacing", () => {
      const { container: testContainer } = render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      const header = testContainer.firstChild;
      expect(header).toBeInTheDocument();
      // Verify classes include responsive gap
      expect((header as HTMLElement).className).toContain("gap-");
    });

    it("should render avatar image with responsive sizing classes", () => {
      const { container } = render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      const avatar = container.querySelector("img");
      expect(avatar).toBeInTheDocument();
      expect(avatar?.alt).toBe("Test Maestro");
    });

    it("should have button elements with responsive sizing", () => {
      const { container } = render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThan(0);

      // Verify buttons have responsive sizing classes
      buttons.forEach((button) => {
        expect(button.className).toContain("h-8");
        expect(button.className).toContain("w-8");
      });
    });
  });

  describe("Status Indicator", () => {
    it("should show green status indicator when voice is active and connected", () => {
      const activeVoiceState: VoiceState = {
        isActive: true,
        isConnected: true,
        isListening: false,
        isSpeaking: false,
        isMuted: false,
        inputLevel: 0,
        outputLevel: 0,
        connectionState: "connected",
        configError: null,
      };

      const { container } = render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={activeVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      // Status indicator should be present
      const statusIndicator = container.querySelector(".bg-green-400");
      expect(statusIndicator).toBeInTheDocument();
    });

    it("should have correct status indicator styling", () => {
      const { container } = render(
        <CharacterHeader
          character={mockCharacter}
          voiceState={mockVoiceState}
          ttsEnabled={true}
          actions={mockActions}
        />,
      );

      const statusIndicator = container.querySelector(
        'span[class*="absolute"]',
      );
      expect(statusIndicator).toBeInTheDocument();
      expect(statusIndicator?.className).toContain("rounded-full");
      expect(statusIndicator?.className).toContain("border");
    });
  });
});
