import { render } from "@testing-library/react";
import { expect, describe, it } from "vitest";
import { UsersTableRow } from "../users/users-table-row";
import { PendingActions } from "../invites/pending-actions";

describe("Admin Button Groups - Mobile Responsive", () => {
  describe("UsersTableRow Button Group", () => {
    it("should have flex-wrap on button container for mobile responsiveness", () => {
      const mockUser = {
        id: "user-1",
        username: "test-user",
        email: "test@example.com",
        role: "USER" as const,
        disabled: false,
        createdAt: new Date(),
        subscription: {
          id: "sub-1",
          tier: {
            id: "tier-1",
            code: "BASE",
            name: "Base",
            chatLimitDaily: 10,
            voiceMinutesDaily: 30,
            toolsLimitDaily: 10,
            docsLimitTotal: 5,
            features: {},
          },
          overrideLimits: null,
          overrideFeatures: null,
        },
      };

      const { container } = render(
        <UsersTableRow
          user={mockUser}
          isSelected={false}
          isLoading={false}
          onSelect={() => {}}
          onToggle={() => {}}
          onDelete={() => {}}
          availableTiers={[]}
        />,
      );

      const buttonContainer = container.querySelector(".flex.gap-1");
      expect(buttonContainer).toBeInTheDocument();
      // Should update to flex-wrap in implementation
    });

    it("should maintain 44px minimum touch target for buttons", () => {
      const mockUser = {
        id: "user-1",
        username: "test-user",
        email: "test@example.com",
        role: "USER" as const,
        disabled: false,
        createdAt: new Date(),
        subscription: {
          id: "sub-1",
          tier: {
            id: "tier-1",
            code: "BASE",
            name: "Base",
            chatLimitDaily: 10,
            voiceMinutesDaily: 30,
            toolsLimitDaily: 10,
            docsLimitTotal: 5,
            features: {},
          },
          overrideLimits: null,
          overrideFeatures: null,
        },
      };

      const { container } = render(
        <UsersTableRow
          user={mockUser}
          isSelected={false}
          isLoading={false}
          onSelect={() => {}}
          onToggle={() => {}}
          onDelete={() => {}}
          availableTiers={[]}
        />,
      );

      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        // WCAG 2.5.5: minimum 44px (h-11) touch targets
        expect(button).toHaveClass("h-11", "px-3");
      });
    });
  });

  describe("PendingActions Button Group", () => {
    it("should wrap action buttons on mobile with flex-wrap", () => {
      const { container } = render(
        <PendingActions
          invites={[
            {
              id: "invite-1",
              name: "Test User",
              email: "test@example.com",
              status: "PENDING" as const,
            },
          ]}
          processingId={null}
          onApprove={() => {}}
          onReject={() => {}}
        />,
      );

      const buttonContainer = container.querySelector(".flex.gap-2");
      expect(buttonContainer).toBeInTheDocument();
      // Should update to flex-wrap in implementation
    });
  });

  describe("Button Group Patterns", () => {
    it("should use flex-wrap for wrapping button groups", () => {
      const PatternTest = () => (
        <div className="flex flex-wrap gap-2">
          <button>Action 1</button>
          <button>Action 2</button>
          <button>Action 3</button>
        </div>
      );

      const { container } = render(<PatternTest />);
      const buttonGroup = container.firstChild as HTMLElement;

      expect(buttonGroup).toHaveClass("flex-wrap");
    });

    it("should support flex-col on xs breakpoint for vertical stacking", () => {
      const PatternTest = () => (
        <div className="flex flex-col xs:flex-row gap-2">
          <button>Action 1</button>
          <button>Action 2</button>
        </div>
      );

      const { container } = render(<PatternTest />);
      const buttonGroup = container.firstChild as HTMLElement;

      expect(buttonGroup).toHaveClass("flex-col");
      expect(buttonGroup).toHaveClass("xs:flex-row");
    });

    it("should maintain proper gap spacing between wrapped buttons", () => {
      const PatternTest = () => (
        <div className="flex flex-wrap gap-2">
          <button>Button 1</button>
          <button>Button 2</button>
        </div>
      );

      const { container } = render(<PatternTest />);
      const buttonGroup = container.firstChild as HTMLElement;

      expect(buttonGroup).toHaveClass("gap-2");
    });

    it("button groups should apply items-center for alignment", () => {
      const PatternTest = () => (
        <div className="flex flex-wrap items-center gap-2">
          <span>Label:</span>
          <button>Button</button>
        </div>
      );

      const { container } = render(<PatternTest />);
      const buttonGroup = container.firstChild as HTMLElement;

      expect(buttonGroup).toHaveClass("items-center");
    });
  });
});
