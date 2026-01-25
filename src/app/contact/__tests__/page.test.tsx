/**
 * Unit tests for Contact page
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ContactPage from "../page";

describe("Contact Page", () => {
  describe("Page Rendering", () => {
    it("renders the page with proper structure", () => {
      render(<ContactPage />);

      expect(screen.getByRole("main")).toBeInTheDocument();
    });

    it("renders page heading", () => {
      render(<ContactPage />);

      expect(
        screen.getByRole("heading", { name: /contattaci/i }),
      ).toBeInTheDocument();
    });

    it("renders contact form", () => {
      render(<ContactPage />);

      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("renders navigation back button", () => {
      render(<ContactPage />);

      const backLink = screen.getByRole("link", { name: /torna/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute("href", "/");
    });

    it("has gradient background matching MirrorBuddy theme", () => {
      const { container } = render(<ContactPage />);

      const mainDiv = container.querySelector('[class*="gradient"]');
      expect(mainDiv).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has a main landmark", () => {
      render(<ContactPage />);
      expect(screen.getByRole("main")).toBeInTheDocument();
    });

    it("has proper heading hierarchy", () => {
      render(<ContactPage />);

      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveTextContent(/contattaci/i);
    });

    it("renders description text", () => {
      render(<ContactPage />);

      const description = screen.queryByText(/descrivi il tuo argomento/i);
      expect(description).toBeInTheDocument();
    });
  });
});
