/**
 * Unit tests for SchoolPortal component
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SchoolPortal } from "../school-portal";

describe("SchoolPortal", () => {
  it("renders school information correctly", () => {
    render(<SchoolPortal />);

    expect(screen.getByText("School Portal")).toBeInTheDocument();
    expect(
      screen.getByText(/Liceo Scientifico "G. Galilei"/i),
    ).toBeInTheDocument();
  });

  it("lists classes with student counts", () => {
    render(<SchoolPortal />);

    expect(screen.getByText("3A - Scientifico")).toBeInTheDocument();
    expect(screen.getByText("24 Students")).toBeInTheDocument();
    expect(screen.getByText("Prof. Rossi")).toBeInTheDocument();
  });

  it("shows compliance status section", () => {
    render(<SchoolPortal />);

    expect(screen.getByText("Compliance Status")).toBeInTheDocument();
    expect(screen.getByText("Data Protection (GDPR)")).toBeInTheDocument();
    expect(screen.getByText("Parental Consent")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("contains action buttons", () => {
    render(<SchoolPortal />);

    expect(screen.getByText("Export Reports")).toBeInTheDocument();
    expect(screen.getByText("Add New Class")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<SchoolPortal />);
    expect(
      screen.getByPlaceholderText("Search classes..."),
    ).toBeInTheDocument();
  });
});
