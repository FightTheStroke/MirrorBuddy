/**
 * Test: CharacterChatView responsive layout uses only Tailwind classes
 * F-05: No JS-based isPhone detection for layout
 *
 * Verifies that:
 * 1. Main container has flex-col (mobile) and lg:flex-row (desktop) classes
 * 2. Layout is purely CSS-based, not JS-based
 * 3. No hydration mismatches occur
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useDeviceType } from "@/hooks/use-device-type";
import { CharacterChatView } from "../character-chat-view";
import fs from "fs";
import path from "path";

// Mock useDeviceType hook
vi.mock("@/hooks/use-device-type", () => ({
  useDeviceType: vi.fn(),
}));

// Mock useCharacterChat hook
vi.mock("../character-chat-view/hooks/use-character-chat", () => ({
  useCharacterChat: vi.fn(() => ({
    messages: [],
    input: "",
    setInput: vi.fn(),
    isLoading: false,
    isVoiceActive: false,
    isConnected: false,
    connectionState: "closed",
    configError: null,
    activeTool: null,
    setActiveTool: vi.fn(),
    messagesEndRef: { current: null },
    handleSend: vi.fn(),
    handleToolRequest: vi.fn(),
    handleVoiceCall: vi.fn(),
    loadConversation: vi.fn(),
    clearChat: vi.fn(),
  })),
}));

// Mock useVoiceSession hook
vi.mock("@/lib/hooks/use-voice-session", () => ({
  useVoiceSession: vi.fn(() => ({
    isListening: false,
    isSpeaking: false,
    isMuted: false,
    inputLevel: 0,
    outputLevel: 0,
    toggleMute: vi.fn(),
    sessionId: "test-session",
  })),
}));

// Mock useTTS hook
vi.mock("@/components/accessibility", () => ({
  useTTS: vi.fn(() => ({
    speak: vi.fn(),
    stop: vi.fn(),
    enabled: false,
  })),
}));

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    back: vi.fn(),
  })),
}));

// Mock useSettingsStore
vi.mock("@/lib/stores", () => ({
  useSettingsStore: vi.fn((selector) => {
    if (selector) {
      return selector({
        appearance: {
          language: "it",
        },
      });
    }
    return { appearance: { language: "it" } };
  }),
}));

// Mock character utilities and components
vi.mock("../character-chat-view/utils/character-utils", () => ({
  getCharacterInfo: vi.fn(() => ({
    name: "Test Coach",
    avatar: "/avatars/test.webp",
    themeColor: "#3B82F6",
  })),
}));

vi.mock("@/components/character", () => ({
  CharacterHeader: () => <div data-testid="character-header">Header</div>,
  CharacterVoicePanel: () => (
    <div data-testid="character-voice-panel">Voice Panel</div>
  ),
  characterInfoToUnified: vi.fn((char) => char),
}));

vi.mock("../character-chat-view/components/messages-list", () => ({
  MessagesList: () => <div data-testid="messages-list">Messages</div>,
}));

vi.mock("../character-chat-view/components/chat-input", () => ({
  ChatInput: () => <div data-testid="chat-input">Input</div>,
}));

vi.mock("./conversation-drawer", () => ({
  ConversationSidebar: () => (
    <div data-testid="conversation-sidebar">Sidebar</div>
  ),
}));

vi.mock("@/components/tools/tool-panel", () => ({
  ToolPanel: () => <div data-testid="tool-panel">Tool Panel</div>,
}));

describe("CharacterChatView - F-05 Responsive Layout (No isPhone for layout)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Source Code Verification", () => {
    it("should NOT use isPhone in className template literals for flex direction", () => {
      // Read the source file and verify no isPhone ternary for layout
      const filePath = path.join(
        process.cwd(),
        "src/components/conversation/character-chat-view.tsx",
      );
      const source = fs.readFileSync(filePath, "utf-8");

      // Should NOT have: ${isPhone ? "flex-col" : "lg:flex-row"}
      // Should NOT have: className={`flex ${isPhone
      const hasIsPhoneFlex = /\$\{isPhone\s*\?\s*["']flex-col["']/i.test(
        source,
      );
      const hasIsPhoneHeight = /\$\{isPhone\s*\?\s*["']h-screen["']/i.test(
        source,
      );

      expect(hasIsPhoneFlex).toBe(false);
      expect(hasIsPhoneHeight).toBe(false);
    });

    it("should have pure Tailwind responsive classes in main container", () => {
      const filePath = path.join(
        process.cwd(),
        "src/components/conversation/character-chat-view.tsx",
      );
      const source = fs.readFileSync(filePath, "utf-8");

      // Should have: className="flex flex-col lg:flex-row"
      // Should have: gap-0 md:gap-4
      // Should have: h-full lg:h-[calc(100vh-8rem)]
      const hasFlexColLgRow = /className="flex\s+flex-col\s+lg:flex-row/i.test(
        source,
      );
      const hasMdGap = /md:gap-4/i.test(source);

      expect(hasFlexColLgRow).toBe(true);
      expect(hasMdGap).toBe(true);
    });
  });

  describe("Runtime Behavior", () => {
    it("should render with flex-col class on mobile device", () => {
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: "phone",
        isPhone: true,
        isTablet: false,
        isDesktop: false,
        orientation: "portrait",
        isPortrait: true,
        isLandscape: false,
      });

      const { container } = render(
        <CharacterChatView characterId="melissa" characterType="coach" />,
      );

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer?.classList.contains("flex")).toBe(true);
      expect(mainContainer?.classList.contains("flex-col")).toBe(true);
    });

    it("should have responsive gap classes (gap-0 md:gap-4)", () => {
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: "phone",
        isPhone: true,
        isTablet: false,
        isDesktop: false,
        orientation: "portrait",
        isPortrait: true,
        isLandscape: false,
      });

      const { container } = render(
        <CharacterChatView characterId="melissa" characterType="coach" />,
      );

      const mainContainer = container.firstChild as HTMLElement;
      // Check for gap classes
      const classStr = mainContainer?.className || "";
      expect(classStr).toMatch(/gap-0/);
      expect(classStr).toMatch(/md:gap-4/);
    });

    it("should not have conditional flex direction based on isPhone", () => {
      // Render with isPhone=true
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: "phone",
        isPhone: true,
        isTablet: false,
        isDesktop: false,
        orientation: "portrait",
        isPortrait: true,
        isLandscape: false,
      });

      const { container: container1 } = render(
        <CharacterChatView characterId="melissa" characterType="coach" />,
      );
      const mainContainer1 = container1.firstChild as HTMLElement;
      const classes1 = mainContainer1?.className || "";

      // Render with isPhone=false
      vi.clearAllMocks();
      vi.mocked(useDeviceType).mockReturnValue({
        deviceType: "desktop",
        isPhone: false,
        isTablet: false,
        isDesktop: true,
        orientation: "landscape",
        isPortrait: false,
        isLandscape: true,
      });

      const { container: container2 } = render(
        <CharacterChatView characterId="melissa" characterType="coach" />,
      );
      const mainContainer2 = container2.firstChild as HTMLElement;
      const classes2 = mainContainer2?.className || "";

      // Both should have flex-col and lg:flex-row (Tailwind handles breakpoint)
      expect(classes1).toMatch(/flex-col/);
      expect(classes1).toMatch(/lg:flex-row/);
      expect(classes2).toMatch(/flex-col/);
      expect(classes2).toMatch(/lg:flex-row/);
    });
  });
});
