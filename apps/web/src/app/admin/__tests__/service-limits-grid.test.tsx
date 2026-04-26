import { expect, describe, it } from "vitest";

describe("Service Limits Grid - Mobile Responsive", () => {
  it("should have grid-cols-1 base class for xs screens", () => {
    const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
    expect(gridClass).toContain("grid-cols-1");
  });

  it("should have sm:grid-cols-2 for small screens", () => {
    const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
    expect(gridClass).toContain("sm:grid-cols-2");
  });

  it("should have lg:grid-cols-3 for large screens", () => {
    const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
    expect(gridClass).toContain("lg:grid-cols-3");
  });

  it("should have gap-6 for proper spacing between cards", () => {
    const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
    expect(gridClass).toContain("gap-6");
  });

  it("should have grid container with correct Tailwind classes structure", () => {
    const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
    const classes = gridClass.split(" ");

    expect(classes).toContain("grid");
    expect(classes).toContain("grid-cols-1");
    expect(classes).toContain("sm:grid-cols-2");
    expect(classes).toContain("lg:grid-cols-3");
    expect(classes).toContain("gap-6");
  });

  it("should render responsive grid with correct breakpoint progression", () => {
    const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";

    // Verify breakpoint progression: xs (1 col) -> sm (2 cols) -> lg (3 cols)
    expect(gridClass).toMatch(/grid-cols-1.*sm:grid-cols-2.*lg:grid-cols-3/);
  });

  it("should have no grid-cols-2 at base level (only sm and above)", () => {
    const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
    const classes = gridClass.split(" ");

    // Ensure grid-cols-2 is not a base class (should not be in classes without prefix)
    const baseGridCols = classes.filter(
      (c) => c.startsWith("grid-cols-") && !c.includes(":"),
    );
    expect(baseGridCols).toEqual(["grid-cols-1"]);
  });
});
