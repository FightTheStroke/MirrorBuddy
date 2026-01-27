/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next-intl with Italian translations
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      "header.search.placeholder": "Cerca materiali...",
      "header.search.ariaLabel": "Cerca materiali",
      "header.search.clearAriaLabel": "Cancella ricerca",
      "header.filter.ariaLabel": "Filtra per tipo",
      "header.filter.listboxAriaLabel": "Seleziona tipo",
      "types.all": "Tutti",
      "types.mindmap": "Mappe mentali",
      "types.quiz": "Quiz",
      "types.flashcard": "Flashcard",
      "types.summary": "Riassunti",
      "types.demo": "Demo",
      "types.diagram": "Diagrammi",
      "types.timeline": "Timeline",
      "types.formula": "Formule",
      "types.calculator": "Calcolatrice",
      "types.chart": "Grafici",
      "types.pdf": "PDF",
      "types.webcam": "Webcam",
      "types.homework": "Compiti",
      "types.search": "Ricerca",
      "types.typing": "Digitazione",
      "types.studyKit": "Study Kit",
    };
    if (key === "header.search.announcement" && params?.value) {
      return `Ricerca: ${params.value}`;
    }
    return translations[key] || key;
  },
}));

import { SearchBar } from "../search-bar";

describe("SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic Rendering", () => {
    it("should render search input", () => {
      render(<SearchBar value="" onChange={vi.fn()} />);

      const searchbox = screen.getByRole("searchbox");
      expect(searchbox).toBeInTheDocument();
    });

    it("should display placeholder text", () => {
      render(
        <SearchBar
          value=""
          onChange={vi.fn()}
          placeholder="Cerca materiali..."
        />,
      );

      const input = screen.getByPlaceholderText("Cerca materiali...");
      expect(input).toBeInTheDocument();
    });

    it("should display current value", () => {
      render(<SearchBar value="test query" onChange={vi.fn()} />);

      const input = screen.getByRole("searchbox");
      expect(input).toHaveValue("test query");
    });

    it("should show clear button when value exists", () => {
      render(<SearchBar value="test" onChange={vi.fn()} />);

      const clearButton = screen.getByLabelText("Cancella ricerca");
      expect(clearButton).toBeInTheDocument();
    });

    it("should not show clear button when empty", () => {
      render(<SearchBar value="" onChange={vi.fn()} />);

      const clearButton = screen.queryByLabelText("Cancella ricerca");
      expect(clearButton).not.toBeInTheDocument();
    });
  });

  describe("Debounced Search", () => {
    it("should debounce search input", async () => {
      const onChange = vi.fn();
      render(<SearchBar value="" onChange={onChange} debounceMs={300} />);

      const input = screen.getByRole("searchbox");
      fireEvent.change(input, { target: { value: "test" } });

      // Should not be called immediately
      expect(onChange).not.toHaveBeenCalled();

      // Fast-forward past debounce time
      vi.advanceTimersByTime(300);

      expect(onChange).toHaveBeenCalledWith("test");
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("should use custom debounce delay", async () => {
      const onChange = vi.fn();
      render(<SearchBar value="" onChange={onChange} debounceMs={500} />);

      const input = screen.getByRole("searchbox");
      fireEvent.change(input, { target: { value: "test" } });

      // At 300ms, should not be called
      vi.advanceTimersByTime(300);
      expect(onChange).not.toHaveBeenCalled();

      // At 500ms, should be called
      vi.advanceTimersByTime(200);
      expect(onChange).toHaveBeenCalledWith("test");
    });

    it("should cancel previous debounce on new input", async () => {
      const onChange = vi.fn();
      render(<SearchBar value="" onChange={onChange} debounceMs={300} />);

      const input = screen.getByRole("searchbox");

      // Type first value
      fireEvent.change(input, { target: { value: "first" } });
      vi.advanceTimersByTime(200);

      // Type second value before debounce completes
      fireEvent.change(input, { target: { value: "second" } });
      vi.advanceTimersByTime(300);

      // Only second value should be emitted
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith("second");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should clear search on Escape key when value exists", () => {
      const onChange = vi.fn();
      render(<SearchBar value="test" onChange={onChange} />);

      const input = screen.getByRole("searchbox");
      fireEvent.keyDown(input, { key: "Escape" });

      expect(onChange).toHaveBeenCalledWith("");
    });

    it("should blur input on Escape key when empty", () => {
      const onChange = vi.fn();
      render(<SearchBar value="" onChange={onChange} />);

      const input = screen.getByRole("searchbox") as HTMLInputElement;
      input.focus();
      expect(document.activeElement).toBe(input);

      fireEvent.keyDown(input, { key: "Escape" });

      expect(document.activeElement).not.toBe(input);
    });

    it("should clear search when clear button is clicked", () => {
      const onChange = vi.fn();
      render(<SearchBar value="test" onChange={onChange} />);

      const clearButton = screen.getByLabelText("Cancella ricerca");
      fireEvent.click(clearButton);

      expect(onChange).toHaveBeenCalledWith("");
    });
  });

  describe("Type Filter", () => {
    it("should show filter button when showFilters is true", () => {
      render(
        <SearchBar
          value=""
          onChange={vi.fn()}
          showFilters={true}
          onTypeFilterChange={vi.fn()}
        />,
      );

      const filterButton = screen.getByLabelText("Filtra per tipo");
      expect(filterButton).toBeInTheDocument();
    });

    it("should not show filter button when showFilters is false", () => {
      render(
        <SearchBar
          value=""
          onChange={vi.fn()}
          showFilters={false}
          onTypeFilterChange={vi.fn()}
        />,
      );

      const filterButton = screen.queryByLabelText("Filtra per tipo");
      expect(filterButton).not.toBeInTheDocument();
    });

    it("should open filter dropdown on click", () => {
      render(
        <SearchBar
          value=""
          onChange={vi.fn()}
          showFilters={true}
          onTypeFilterChange={vi.fn()}
        />,
      );

      const filterButton = screen.getByLabelText("Filtra per tipo");
      fireEvent.click(filterButton);

      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeInTheDocument();
    });

    it("should call onTypeFilterChange when type is selected", () => {
      const onTypeFilterChange = vi.fn();
      render(
        <SearchBar
          value=""
          onChange={vi.fn()}
          showFilters={true}
          onTypeFilterChange={onTypeFilterChange}
        />,
      );

      // Open dropdown
      const filterButton = screen.getByLabelText("Filtra per tipo");
      fireEvent.click(filterButton);

      // Select a type
      const quizOption = screen.getByRole("option", { name: /quiz/i });
      fireEvent.click(quizOption);

      expect(onTypeFilterChange).toHaveBeenCalledWith("quiz");
    });

    it("should close dropdown after selection", () => {
      render(
        <SearchBar
          value=""
          onChange={vi.fn()}
          showFilters={true}
          onTypeFilterChange={vi.fn()}
        />,
      );

      // Open dropdown
      const filterButton = screen.getByLabelText("Filtra per tipo");
      fireEvent.click(filterButton);

      // Select a type
      const quizOption = screen.getByRole("option", { name: /quiz/i });
      fireEvent.click(quizOption);

      // Listbox should be closed
      const listbox = screen.queryByRole("listbox");
      expect(listbox).not.toBeInTheDocument();
    });

    it("should show current filter selection", () => {
      render(
        <SearchBar
          value=""
          onChange={vi.fn()}
          showFilters={true}
          typeFilter="mindmap"
          onTypeFilterChange={vi.fn()}
        />,
      );

      // Open dropdown
      const filterButton = screen.getByLabelText("Filtra per tipo");
      fireEvent.click(filterButton);

      // Mindmap option should be selected
      const mindmapOption = screen.getByRole("option", {
        name: /mappe mentali/i,
      });
      expect(mindmapOption).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes on search input", () => {
      render(<SearchBar value="" onChange={vi.fn()} />);

      const searchbox = screen.getByRole("searchbox");
      expect(searchbox).toHaveAttribute("aria-label", "Cerca materiali");
      expect(searchbox).toHaveAttribute("autocomplete", "off");
    });

    it("should announce search query to screen readers", () => {
      render(<SearchBar value="test query" onChange={vi.fn()} />);

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Ricerca: test query");
    });

    it("should have aria-expanded on filter button", () => {
      render(
        <SearchBar
          value=""
          onChange={vi.fn()}
          showFilters={true}
          onTypeFilterChange={vi.fn()}
        />,
      );

      const filterButton = screen.getByLabelText("Filtra per tipo");
      expect(filterButton).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(filterButton);
      expect(filterButton).toHaveAttribute("aria-expanded", "true");
    });

    it("should have aria-haspopup on filter button", () => {
      render(
        <SearchBar
          value=""
          onChange={vi.fn()}
          showFilters={true}
          onTypeFilterChange={vi.fn()}
        />,
      );

      const filterButton = screen.getByLabelText("Filtra per tipo");
      expect(filterButton).toHaveAttribute("aria-haspopup", "listbox");
    });

    it("should have aria-label on clear button", () => {
      render(<SearchBar value="test" onChange={vi.fn()} />);

      const clearButton = screen.getByLabelText("Cancella ricerca");
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe("Auto Focus", () => {
    it("should auto-focus when autoFocus is true", () => {
      render(<SearchBar value="" onChange={vi.fn()} autoFocus={true} />);

      const input = screen.getByRole("searchbox");
      expect(document.activeElement).toBe(input);
    });

    it("should not auto-focus when autoFocus is false", () => {
      render(<SearchBar value="" onChange={vi.fn()} autoFocus={false} />);

      const input = screen.getByRole("searchbox");
      expect(document.activeElement).not.toBe(input);
    });
  });
});
