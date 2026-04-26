import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { MaestriGrid } from "../maestri-grid";

describe("MaestriGrid - Search Bar Mobile Responsive", () => {
  it('renders search input with type="search" for mobile keyboard', () => {
    render(<MaestriGrid />);
    const searchInput = screen.getByLabelText(/cerca professore o materia/i);
    expect(searchInput).toHaveAttribute("type", "search");
  });

  it("does not show clear button when search is empty", () => {
    render(<MaestriGrid />);
    const clearButton = screen.queryByLabelText(/cancella ricerca/i);
    expect(clearButton).not.toBeInTheDocument();
  });

  it("shows clear button when search text is entered", async () => {
    const user = userEvent.setup();
    render(<MaestriGrid />);
    const searchInput = screen.getByLabelText(/cerca professore o materia/i);
    await user.type(searchInput, "Galileo");
    const clearButton = screen.getByLabelText(/cancella ricerca/i);
    expect(clearButton).toBeInTheDocument();
  });

  it("clear button clears search text when clicked", async () => {
    const user = userEvent.setup();
    render(<MaestriGrid />);
    const searchInput = screen.getByLabelText(
      /cerca professore o materia/i,
    ) as HTMLInputElement;
    await user.type(searchInput, "Physics");
    expect(searchInput.value).toBe("Physics");
    const clearButton = screen.getByLabelText(/cancella ricerca/i);
    await user.click(clearButton);
    expect(searchInput.value).toBe("");
  });

  it("clear button has 44x44px minimum touch target", async () => {
    const user = userEvent.setup();
    render(<MaestriGrid />);
    const searchInput = screen.getByLabelText(/cerca professore o materia/i);
    await user.type(searchInput, "test");
    const clearButton = screen.getByLabelText(/cancella ricerca/i);
    expect(clearButton).toHaveClass("h-11");
    expect(clearButton).toHaveClass("w-11");
  });

  it("search input takes full width on mobile breakpoints", () => {
    render(<MaestriGrid />);
    const searchInput = screen.getByLabelText(/cerca professore o materia/i);
    const searchContainer = searchInput.closest(".relative");
    expect(searchContainer).toHaveClass("w-full");
    expect(searchContainer).toHaveClass("sm:w-96");
  });

  it("search bar maintains responsive layout with clear button visible", async () => {
    const user = userEvent.setup();
    render(<MaestriGrid />);
    const searchInput = screen.getByLabelText(/cerca professore o materia/i);
    await user.type(searchInput, "Galileo");
    const searchContainer = searchInput.closest(".relative");
    expect(searchContainer).toHaveClass("w-full");
    expect(searchContainer).toHaveClass("sm:w-96");
  });

  it("clear button is positioned correctly with search icon on left", async () => {
    const user = userEvent.setup();
    render(<MaestriGrid />);
    const searchInput = screen.getByLabelText(
      /cerca professore o materia/i,
    ) as HTMLInputElement;
    await user.type(searchInput, "test");
    const clearButton = screen.getByLabelText(/cancella ricerca/i);
    expect(searchInput.classList.contains("pl-8")).toBe(true);
    expect(clearButton).toHaveClass("absolute");
    expect(clearButton).toHaveClass("right-1");
  });
});

describe("MaestriGrid - Responsive Columns (F-37)", () => {
  it("renders grid container with responsive column classes", () => {
    const { container } = render(<MaestriGrid />);
    const gridDiv = container.querySelector('[class*="grid"]');
    expect(gridDiv).toBeInTheDocument();
  });

  it("has 1 column on xs screens (grid-cols-1)", () => {
    const { container } = render(<MaestriGrid />);
    const gridDiv = container.querySelector('[class*="grid"]');
    expect(gridDiv?.className).toMatch(/grid-cols-1/);
  });

  it("has 2 columns on sm screens (sm:grid-cols-2)", () => {
    const { container } = render(<MaestriGrid />);
    const gridDiv = container.querySelector('[class*="grid"]');
    expect(gridDiv?.className).toMatch(/sm:grid-cols-2/);
  });

  it("has 3 columns on md screens (md:grid-cols-3)", () => {
    const { container } = render(<MaestriGrid />);
    const gridDiv = container.querySelector('[class*="grid"]');
    expect(gridDiv?.className).toMatch(/md:grid-cols-3/);
  });

  it("has 4 columns on lg+ screens (lg:grid-cols-4)", () => {
    const { container } = render(<MaestriGrid />);
    const gridDiv = container.querySelector('[class*="grid"]');
    expect(gridDiv?.className).toMatch(/lg:grid-cols-4/);
  });

  it("has responsive gap - gap-3 on mobile", () => {
    const { container } = render(<MaestriGrid />);
    const gridDiv = container.querySelector('[class*="grid"]');
    expect(gridDiv?.className).toMatch(/gap-3/);
  });

  it("has responsive gap - sm:gap-4 on desktop", () => {
    const { container } = render(<MaestriGrid />);
    const gridDiv = container.querySelector('[class*="grid"]');
    expect(gridDiv?.className).toMatch(/sm:gap-4/);
  });

  it("displays all responsive column classes together", () => {
    const { container } = render(<MaestriGrid />);
    const gridDiv = container.querySelector('[class*="grid"]');
    expect(gridDiv?.className).toMatch(/grid-cols-1/);
    expect(gridDiv?.className).toMatch(/sm:grid-cols-2/);
    expect(gridDiv?.className).toMatch(/md:grid-cols-3/);
    expect(gridDiv?.className).toMatch(/lg:grid-cols-4/);
  });
});
