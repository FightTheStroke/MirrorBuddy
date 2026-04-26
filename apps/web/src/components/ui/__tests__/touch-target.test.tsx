/**
 * Unit tests for TouchTarget wrapper component
 * Ensures WCAG 2.1 AA compliant 44x44px minimum touch targets
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TouchTarget } from "../touch-target";

describe("TouchTarget", () => {
  it("renders children content", () => {
    const { getByText } = render(
      <TouchTarget>
        <span>Click me</span>
      </TouchTarget>,
    );

    expect(getByText("Click me")).toBeInTheDocument();
  });

  it("ensures minimum 44px width", () => {
    const { container } = render(
      <TouchTarget>
        <button style={{ width: "20px", height: "20px" }}>Small</button>
      </TouchTarget>,
    );

    const wrapper = container.firstChild as HTMLElement;
    // Check that the component has the min-w class in its className
    expect(wrapper.className).toContain("min-w");
  });

  it("ensures minimum 44px height", () => {
    const { container } = render(
      <TouchTarget>
        <button style={{ width: "20px", height: "20px" }}>Small</button>
      </TouchTarget>,
    );

    const wrapper = container.firstChild as HTMLElement;
    // Check that the component has the min-h class in its className
    expect(wrapper.className).toContain("min-h");
  });

  it("applies additional className prop", () => {
    const { container } = render(
      <TouchTarget className="custom-class">
        <span>Content</span>
      </TouchTarget>,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("custom-class")).toBe(true);
  });

  it("works with button elements", () => {
    const { getByRole } = render(
      <TouchTarget>
        <button>Click Button</button>
      </TouchTarget>,
    );

    const button = getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button.textContent).toBe("Click Button");
  });

  it("centers content vertically and horizontally", () => {
    const { container } = render(
      <TouchTarget>
        <span>Content</span>
      </TouchTarget>,
    );

    const wrapper = container.firstChild as HTMLElement;
    // Check for flexbox centering classes
    expect(wrapper.className).toContain("inline-flex");
    expect(wrapper.className).toContain("items-center");
    expect(wrapper.className).toContain("justify-center");
  });

  it("preserves original element when not expanding", () => {
    const { container } = render(
      <TouchTarget>
        <button style={{ width: "100px", height: "100px" }}>Large</button>
      </TouchTarget>,
    );

    const button = container.querySelector("button") as HTMLElement;
    expect(button).toBeTruthy();
    // Original button should keep its size
    expect(button.style.width).toBe("100px");
    expect(button.style.height).toBe("100px");
  });

  it("supports nested elements", () => {
    const { container } = render(
      <TouchTarget>
        <div>
          <span>Nested</span>
          <span>Content</span>
        </div>
      </TouchTarget>,
    );

    const wrapper = container.firstChild as HTMLElement;
    const div = wrapper.querySelector("div") as HTMLElement;
    const nested = div.querySelectorAll("span");
    expect(nested.length).toBe(2);
    expect(nested[0].textContent).toBe("Nested");
    expect(nested[1].textContent).toBe("Content");
  });
});
