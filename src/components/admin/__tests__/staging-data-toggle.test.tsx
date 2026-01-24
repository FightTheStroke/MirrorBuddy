/**
 * MIRRORBUDDY - Staging Data Toggle Component Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StagingDataToggle } from "../staging-data-toggle";

describe("StagingDataToggle", () => {
  it("should render checkbox with label", () => {
    const mockOnToggle = vi.fn();
    render(
      <StagingDataToggle showStagingData={false} onToggle={mockOnToggle} />,
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(screen.getByText("Show staging data")).toBeInTheDocument();
  });

  it("should show checked state when showStagingData is true", () => {
    const mockOnToggle = vi.fn();
    render(
      <StagingDataToggle showStagingData={true} onToggle={mockOnToggle} />,
    );

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("should show unchecked state when showStagingData is false", () => {
    const mockOnToggle = vi.fn();
    render(
      <StagingDataToggle showStagingData={false} onToggle={mockOnToggle} />,
    );

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("should call onToggle when checkbox is clicked", async () => {
    const mockOnToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <StagingDataToggle showStagingData={false} onToggle={mockOnToggle} />,
    );

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(mockOnToggle).toHaveBeenCalledWith(true);
  });

  it("should display hidden count when showStagingData is false and hiddenCount > 0", () => {
    const mockOnToggle = vi.fn();
    render(
      <StagingDataToggle
        showStagingData={false}
        onToggle={mockOnToggle}
        hiddenCount={5}
      />,
    );

    expect(screen.getByText("(5 staging records hidden)")).toBeInTheDocument();
  });

  it("should not display hidden count when showStagingData is true", () => {
    const mockOnToggle = vi.fn();
    render(
      <StagingDataToggle
        showStagingData={true}
        onToggle={mockOnToggle}
        hiddenCount={5}
      />,
    );

    expect(
      screen.queryByText("(5 staging records hidden)"),
    ).not.toBeInTheDocument();
  });

  it("should not display hidden count when hiddenCount is 0", () => {
    const mockOnToggle = vi.fn();
    render(
      <StagingDataToggle
        showStagingData={false}
        onToggle={mockOnToggle}
        hiddenCount={0}
      />,
    );

    expect(
      screen.queryByText("(0 staging records hidden)"),
    ).not.toBeInTheDocument();
  });

  it("should not display hidden count when hiddenCount is undefined", () => {
    const mockOnToggle = vi.fn();
    render(
      <StagingDataToggle showStagingData={false} onToggle={mockOnToggle} />,
    );

    expect(
      screen.queryByText(/staging records hidden/),
    ).not.toBeInTheDocument();
  });

  it("should display correct count for different hiddenCount values", () => {
    const mockOnToggle = vi.fn();
    const { rerender } = render(
      <StagingDataToggle
        showStagingData={false}
        onToggle={mockOnToggle}
        hiddenCount={1}
      />,
    );

    expect(screen.getByText("(1 staging records hidden)")).toBeInTheDocument();

    rerender(
      <StagingDataToggle
        showStagingData={false}
        onToggle={mockOnToggle}
        hiddenCount={100}
      />,
    );

    expect(
      screen.getByText("(100 staging records hidden)"),
    ).toBeInTheDocument();
  });
});
