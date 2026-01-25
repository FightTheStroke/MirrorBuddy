/**
 * Unit tests for ProtectedUsersCard component
 * Tests for F-03: Protected Users whitelist display
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProtectedUsersCard } from "../protected-users-card";

describe("ProtectedUsersCard", () => {
  beforeEach(() => {
    // Reset environment variables before each test
    delete process.env.PROTECTED_USERS;
  });

  it("renders card with title and description", () => {
    process.env.PROTECTED_USERS = "user1@example.com,user2@example.com";
    render(<ProtectedUsersCard />);

    expect(screen.getByText("Protected Users")).toBeInTheDocument();
    expect(
      screen.getByText("Utenti esclusi da cleanup test"),
    ).toBeInTheDocument();
  });

  it("displays multiple protected emails as list items", () => {
    process.env.PROTECTED_USERS = "admin@example.com,tester@example.com";
    render(<ProtectedUsersCard />);

    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("tester@example.com")).toBeInTheDocument();
  });

  it("handles single email in PROTECTED_USERS", () => {
    process.env.PROTECTED_USERS = "single@example.com";
    render(<ProtectedUsersCard />);

    expect(screen.getByText("single@example.com")).toBeInTheDocument();
  });

  it("displays empty state message when PROTECTED_USERS is not set", () => {
    delete process.env.PROTECTED_USERS;
    render(<ProtectedUsersCard />);

    expect(
      screen.getByText("Nessun utente protetto configurato"),
    ).toBeInTheDocument();
  });

  it("displays empty state message when PROTECTED_USERS is empty string", () => {
    process.env.PROTECTED_USERS = "";
    render(<ProtectedUsersCard />);

    expect(
      screen.getByText("Nessun utente protetto configurato"),
    ).toBeInTheDocument();
  });

  it("trims whitespace from email addresses", () => {
    process.env.PROTECTED_USERS =
      "user1@example.com , user2@example.com , user3@example.com";
    render(<ProtectedUsersCard />);

    expect(screen.getByText("user1@example.com")).toBeInTheDocument();
    expect(screen.getByText("user2@example.com")).toBeInTheDocument();
    expect(screen.getByText("user3@example.com")).toBeInTheDocument();
  });

  it("renders with Shield icon", () => {
    process.env.PROTECTED_USERS = "user@example.com";
    const { container } = render(<ProtectedUsersCard />);

    // Check for SVG icon (lucide-react Shield icon)
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("uses Card, CardHeader, CardTitle, CardContent components", () => {
    process.env.PROTECTED_USERS = "user@example.com";
    const { container } = render(<ProtectedUsersCard />);

    // Card component should render
    const card = container.firstChild;
    expect(card).toHaveClass("rounded-2xl", "border", "bg-card");
  });

  it("displays list items with bullet points", () => {
    process.env.PROTECTED_USERS = "user1@example.com,user2@example.com";
    const { container } = render(<ProtectedUsersCard />);

    // Check for list structure
    const listItems = container.querySelectorAll("li");
    expect(listItems.length).toBe(2);
  });

  it("handles emails with special characters", () => {
    process.env.PROTECTED_USERS =
      "user+tag@example.com,user.name@sub.example.com";
    render(<ProtectedUsersCard />);

    expect(screen.getByText("user+tag@example.com")).toBeInTheDocument();
    expect(screen.getByText("user.name@sub.example.com")).toBeInTheDocument();
  });
});
