/**
 * Unit tests for SystemInfoCard component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SystemInfoCard } from "../system-info-card";

// Mock process.env and process.version
const mockProcessEnv = {
  NODE_ENV: "test",
};

const mockProcessVersion = "v20.11.0";

describe("SystemInfoCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process properties
    Object.defineProperty(process, "env", {
      value: mockProcessEnv,
      writable: true,
    });
    Object.defineProperty(process, "version", {
      value: mockProcessVersion,
      configurable: true,
    });
  });

  describe("Rendering", () => {
    it("renders the component with title", () => {
      render(<SystemInfoCard />);
      expect(screen.getByText("System Info")).toBeInTheDocument();
      expect(screen.getByText("Informazioni sul sistema")).toBeInTheDocument();
    });

    it("displays the app version", () => {
      render(<SystemInfoCard />);
      expect(screen.getByText(/0\.10\.0/)).toBeInTheDocument();
    });

    it("displays the NODE_ENV", () => {
      render(<SystemInfoCard />);
      expect(screen.getByText(/test/)).toBeInTheDocument();
    });

    it("displays the Node.js version", () => {
      render(<SystemInfoCard />);
      expect(screen.getByText(/v20\.11\.0/)).toBeInTheDocument();
    });

    it("displays the build date", () => {
      render(<SystemInfoCard />);
      // Build date uses new Date(), so match any YYYY-MM-DD format
      expect(screen.getByText(/\d{4}-\d{2}-\d{2}/)).toBeInTheDocument();
    });

    it("displays version label", () => {
      render(<SystemInfoCard />);
      expect(screen.getByText("Version")).toBeInTheDocument();
    });

    it("displays environment label", () => {
      render(<SystemInfoCard />);
      expect(screen.getByText("Environment")).toBeInTheDocument();
    });

    it("displays Node label", () => {
      render(<SystemInfoCard />);
      expect(screen.getByText(/Node\s*:/)).toBeInTheDocument();
    });

    it("displays Build label", () => {
      render(<SystemInfoCard />);
      expect(screen.getByText("Build")).toBeInTheDocument();
    });

    it("uses Info icon from lucide-react", () => {
      const { container } = render(<SystemInfoCard />);
      // Check that an icon is rendered (svg with lucide-react class)
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("uses Card component with correct styling", () => {
      const { container } = render(<SystemInfoCard />);
      const card = container.querySelector('[class*="border-border"]');
      expect(card).toBeInTheDocument();
    });

    it("renders as a read-only display component", () => {
      const { container } = render(<SystemInfoCard />);
      // Ensure no interactive elements like buttons or inputs
      const buttons = container.querySelectorAll("button");
      const inputs = container.querySelectorAll("input");
      expect(buttons.length).toBe(0);
      expect(inputs.length).toBe(0);
    });
  });

  describe("Information Grid", () => {
    it("displays info items in a grid layout", () => {
      const { container } = render(<SystemInfoCard />);
      // Look for grid structure
      const gridContainer = container.querySelector('[class*="grid"]');
      expect(gridContainer).toBeInTheDocument();
    });

    it("displays all four info items", () => {
      render(<SystemInfoCard />);
      // Check for version, environment, node, and build info
      expect(screen.getByText("Version")).toBeInTheDocument();
      expect(screen.getByText("Environment")).toBeInTheDocument();
      expect(screen.getByText(/Node\s*:/)).toBeInTheDocument();
      expect(screen.getByText("Build")).toBeInTheDocument();
    });
  });
});
