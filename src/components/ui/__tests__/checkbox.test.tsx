/**
 * Unit tests for Checkbox component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Checkbox } from "../checkbox";

describe("Checkbox", () => {
  it("renders unchecked by default", () => {
    render(<Checkbox />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("renders checked when checked prop is true", () => {
    render(<Checkbox checked={true} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("calls onCheckedChange when clicked", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox onCheckedChange={onCheckedChange} />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(onCheckedChange).toHaveBeenCalled();
  });

  it("supports indeterminate state", () => {
    render(<Checkbox indeterminate={true} />);

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.indeterminate).toBe(true);
  });

  it("renders with aria-label", () => {
    render(<Checkbox aria-label="Select all" />);

    const checkbox = screen.getByRole("checkbox", { name: "Select all" });
    expect(checkbox).toBeInTheDocument();
  });

  it("is disabled when disabled prop is true", () => {
    render(<Checkbox disabled={true} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
  });

  it("applies custom className to visual element", () => {
    const { container } = render(<Checkbox className="custom-class" />);

    // className is applied to the visual div, not the sr-only input
    const visualBox = container.querySelector(".custom-class");
    expect(visualBox).toBeInTheDocument();
  });

  it("toggles between checked states", () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Checkbox checked={false} onCheckedChange={onCheckedChange} />,
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    rerender(<Checkbox checked={true} onCheckedChange={onCheckedChange} />);
    expect(checkbox).toBeChecked();
  });
});
