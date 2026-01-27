/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next-intl for MaterialMenu component
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "materialMenu.ariaLabel": "Menu materiale",
      "materialMenu.open": "Apri",
      "materialMenu.duplicate": "Duplica",
      "materialMenu.move": "Sposta",
      "materialMenu.addTags": "Aggiungi tag",
      "materialMenu.findSimilar": "Trova simili",
      "materialMenu.archive": "Archivia",
      "materialMenu.delete": "Elimina",
    };
    return translations[key] || key;
  },
}));

import { MaterialCard, Material } from "../material-card";

const mockMaterial: Material = {
  id: "mat1",
  title: "Introduzione alla Matematica",
  type: "mindmap",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-02"),
  tags: ["importante", "esame", "algebra"],
  isFavorite: false,
  isArchived: false,
};

const mockMaterialWithFavorite: Material = {
  ...mockMaterial,
  isFavorite: true,
};

describe("MaterialCard", () => {
  describe("Basic Rendering", () => {
    it("should render material title", () => {
      render(<MaterialCard material={mockMaterial} />);

      expect(
        screen.getByText("Introduzione alla Matematica"),
      ).toBeInTheDocument();
    });

    it("should render material type label", () => {
      render(<MaterialCard material={mockMaterial} />);

      expect(screen.getByText("Mappa Mentale")).toBeInTheDocument();
    });

    it("should have option role for selection support", () => {
      render(<MaterialCard material={mockMaterial} />);

      const card = screen.getByRole("option");
      expect(card).toBeInTheDocument();
    });

    it("should have proper aria-label", () => {
      render(<MaterialCard material={mockMaterial} />);

      const card = screen.getByRole("option");
      expect(card).toHaveAttribute(
        "aria-label",
        expect.stringContaining("Introduzione alla Matematica"),
      );
    });
  });

  describe("Type Display", () => {
    it("should display mindmap type", () => {
      render(<MaterialCard material={{ ...mockMaterial, type: "mindmap" }} />);
      expect(screen.getByText("Mappa Mentale")).toBeInTheDocument();
    });

    it("should display quiz type", () => {
      render(<MaterialCard material={{ ...mockMaterial, type: "quiz" }} />);
      expect(screen.getByText("Quiz")).toBeInTheDocument();
    });

    it("should display flashcard type", () => {
      render(
        <MaterialCard material={{ ...mockMaterial, type: "flashcard" }} />,
      );
      expect(screen.getByText("Flashcard")).toBeInTheDocument();
    });

    it("should display summary type", () => {
      render(<MaterialCard material={{ ...mockMaterial, type: "summary" }} />);
      expect(screen.getByText("Riassunto")).toBeInTheDocument();
    });
  });

  describe("Tags Display", () => {
    it("should display up to 3 tags", () => {
      render(<MaterialCard material={mockMaterial} />);

      expect(screen.getByText("importante")).toBeInTheDocument();
      expect(screen.getByText("esame")).toBeInTheDocument();
      expect(screen.getByText("algebra")).toBeInTheDocument();
    });

    it("should show overflow count for more than 3 tags", () => {
      const materialWithManyTags: Material = {
        ...mockMaterial,
        tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
      };

      render(<MaterialCard material={materialWithManyTags} />);

      expect(screen.getByText("+2")).toBeInTheDocument();
    });

    it("should not display tags in compact mode", () => {
      render(<MaterialCard material={mockMaterial} compact={true} />);

      expect(screen.queryByText("importante")).not.toBeInTheDocument();
    });

    it("should not show tags section when no tags", () => {
      const materialWithoutTags: Material = {
        ...mockMaterial,
        tags: [],
      };

      render(<MaterialCard material={materialWithoutTags} />);

      expect(screen.queryByText("importante")).not.toBeInTheDocument();
    });
  });

  describe("Selection", () => {
    it("should show checkbox when onSelect is provided", () => {
      render(<MaterialCard material={mockMaterial} onSelect={vi.fn()} />);

      const checkbox = screen.getByLabelText("Seleziona");
      expect(checkbox).toBeInTheDocument();
    });

    it("should not show checkbox when onSelect is not provided", () => {
      render(<MaterialCard material={mockMaterial} />);

      expect(screen.queryByLabelText("Seleziona")).not.toBeInTheDocument();
    });

    it("should call onSelect when checkbox is clicked", () => {
      const onSelect = vi.fn();
      render(<MaterialCard material={mockMaterial} onSelect={onSelect} />);

      fireEvent.click(screen.getByLabelText("Seleziona"));
      expect(onSelect).toHaveBeenCalledWith("mat1", true);
    });

    it("should show deselect label when selected", () => {
      render(
        <MaterialCard
          material={mockMaterial}
          isSelected={true}
          onSelect={vi.fn()}
        />,
      );

      const checkbox = screen.getByLabelText("Deseleziona");
      expect(checkbox).toBeInTheDocument();
    });

    it("should call onSelect with false when deselecting", () => {
      const onSelect = vi.fn();
      render(
        <MaterialCard
          material={mockMaterial}
          isSelected={true}
          onSelect={onSelect}
        />,
      );

      fireEvent.click(screen.getByLabelText("Deseleziona"));
      expect(onSelect).toHaveBeenCalledWith("mat1", false);
    });

    it("should show aria-selected when selected", () => {
      render(
        <MaterialCard
          material={mockMaterial}
          isSelected={true}
          onSelect={vi.fn()}
        />,
      );

      const card = screen.getByRole("option");
      expect(card).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Favorite", () => {
    it("should show favorite button when onToggleFavorite is provided", () => {
      render(
        <MaterialCard material={mockMaterial} onToggleFavorite={vi.fn()} />,
      );

      const favoriteButton = screen.getByLabelText("Aggiungi ai preferiti");
      expect(favoriteButton).toBeInTheDocument();
    });

    it("should show remove from favorites label when favorited", () => {
      render(
        <MaterialCard
          material={mockMaterialWithFavorite}
          onToggleFavorite={vi.fn()}
        />,
      );

      const favoriteButton = screen.getByLabelText("Rimuovi dai preferiti");
      expect(favoriteButton).toBeInTheDocument();
    });

    it("should call onToggleFavorite when clicked", () => {
      const onToggleFavorite = vi.fn();
      render(
        <MaterialCard
          material={mockMaterial}
          onToggleFavorite={onToggleFavorite}
        />,
      );

      fireEvent.click(screen.getByLabelText("Aggiungi ai preferiti"));
      expect(onToggleFavorite).toHaveBeenCalledWith("mat1");
    });

    it("should have filled star when favorited", () => {
      const { container } = render(
        <MaterialCard
          material={mockMaterialWithFavorite}
          onToggleFavorite={vi.fn()}
        />,
      );

      const starIcon = container.querySelector(".fill-current");
      expect(starIcon).toBeInTheDocument();
    });
  });

  describe("Open Action", () => {
    it("should call onOpen when card is clicked", () => {
      const onOpen = vi.fn();
      render(<MaterialCard material={mockMaterial} onOpen={onOpen} />);

      const card = screen.getByRole("option");
      fireEvent.click(card);
      expect(onOpen).toHaveBeenCalledWith("mat1");
    });

    it("should call onOpen on Enter key", () => {
      const onOpen = vi.fn();
      render(<MaterialCard material={mockMaterial} onOpen={onOpen} />);

      const card = screen.getByRole("option");
      fireEvent.keyDown(card, { key: "Enter" });
      expect(onOpen).toHaveBeenCalledWith("mat1");
    });

    it("should call onOpen on Space key", () => {
      const onOpen = vi.fn();
      render(<MaterialCard material={mockMaterial} onOpen={onOpen} />);

      const card = screen.getByRole("option");
      fireEvent.keyDown(card, { key: " " });
      expect(onOpen).toHaveBeenCalledWith("mat1");
    });
  });

  describe("Context Menu", () => {
    it("should show menu button", () => {
      render(<MaterialCard material={mockMaterial} onOpen={vi.fn()} />);

      const menuButton = screen.getByLabelText("Altre azioni");
      expect(menuButton).toBeInTheDocument();
    });

    it("should open menu on click", () => {
      render(
        <MaterialCard
          material={mockMaterial}
          onOpen={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByLabelText("Altre azioni"));

      const menu = screen.getByRole("menu");
      expect(menu).toBeInTheDocument();
    });

    it("should show Open option in menu", () => {
      render(<MaterialCard material={mockMaterial} onOpen={vi.fn()} />);

      fireEvent.click(screen.getByLabelText("Altre azioni"));

      expect(
        screen.getByRole("menuitem", { name: /apri/i }),
      ).toBeInTheDocument();
    });

    it("should show Duplicate option when onDuplicate is provided", () => {
      render(<MaterialCard material={mockMaterial} onDuplicate={vi.fn()} />);

      fireEvent.click(screen.getByLabelText("Altre azioni"));

      expect(
        screen.getByRole("menuitem", { name: /duplica/i }),
      ).toBeInTheDocument();
    });

    it("should show Move option when onMove is provided", () => {
      render(<MaterialCard material={mockMaterial} onMove={vi.fn()} />);

      fireEvent.click(screen.getByLabelText("Altre azioni"));

      expect(
        screen.getByRole("menuitem", { name: /sposta/i }),
      ).toBeInTheDocument();
    });

    it("should show Delete option when onDelete is provided", () => {
      render(<MaterialCard material={mockMaterial} onDelete={vi.fn()} />);

      fireEvent.click(screen.getByLabelText("Altre azioni"));

      expect(
        screen.getByRole("menuitem", { name: /elimina/i }),
      ).toBeInTheDocument();
    });

    it("should call action and close menu when option clicked", () => {
      const onDelete = vi.fn();
      render(<MaterialCard material={mockMaterial} onDelete={onDelete} />);

      fireEvent.click(screen.getByLabelText("Altre azioni"));
      fireEvent.click(screen.getByRole("menuitem", { name: /elimina/i }));

      expect(onDelete).toHaveBeenCalledWith("mat1");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("Keyboard Delete", () => {
    it("should call onDelete on Delete key", () => {
      const onDelete = vi.fn();
      render(<MaterialCard material={mockMaterial} onDelete={onDelete} />);

      const card = screen.getByRole("option");
      fireEvent.keyDown(card, { key: "Delete" });

      expect(onDelete).toHaveBeenCalledWith("mat1");
    });
  });

  describe("Drag and Drop", () => {
    it("should show drag handle when isDraggable is true", () => {
      render(<MaterialCard material={mockMaterial} isDraggable={true} />);

      const dragHandle = screen.getByLabelText(/trascina per riordinare/i);
      expect(dragHandle).toBeInTheDocument();
    });

    it("should not show drag handle when isDraggable is false", () => {
      render(<MaterialCard material={mockMaterial} isDraggable={false} />);

      expect(screen.queryByLabelText(/trascina/i)).not.toBeInTheDocument();
    });

    it("should call onKeyboardMove on ArrowUp", () => {
      const onKeyboardMove = vi.fn();
      render(
        <MaterialCard
          material={mockMaterial}
          isDraggable={true}
          onKeyboardMove={onKeyboardMove}
        />,
      );

      const dragHandle = screen.getByLabelText(/trascina per riordinare/i);
      fireEvent.keyDown(dragHandle, { key: "ArrowUp" });

      expect(onKeyboardMove).toHaveBeenCalledWith("mat1", "up");
    });

    it("should call onKeyboardMove on ArrowDown", () => {
      const onKeyboardMove = vi.fn();
      render(
        <MaterialCard
          material={mockMaterial}
          isDraggable={true}
          onKeyboardMove={onKeyboardMove}
        />,
      );

      const dragHandle = screen.getByLabelText(/trascina per riordinare/i);
      fireEvent.keyDown(dragHandle, { key: "ArrowDown" });

      expect(onKeyboardMove).toHaveBeenCalledWith("mat1", "down");
    });

    it("should set draggable attribute", () => {
      render(<MaterialCard material={mockMaterial} isDraggable={true} />);

      const card = screen.getByRole("option");
      expect(card).toHaveAttribute("draggable", "true");
    });
  });

  describe("Compact Mode", () => {
    it("should apply smaller padding in compact mode", () => {
      const { container } = render(
        <MaterialCard material={mockMaterial} compact={true} />,
      );

      expect(container.firstChild).toHaveClass("p-3");
    });

    it("should apply larger padding in normal mode", () => {
      const { container } = render(
        <MaterialCard material={mockMaterial} compact={false} />,
      );

      expect(container.firstChild).toHaveClass("p-4");
    });
  });

  describe("Date Display", () => {
    it("should display relative date for today", () => {
      const todayMaterial: Material = {
        ...mockMaterial,
        updatedAt: new Date(),
      };

      render(<MaterialCard material={todayMaterial} />);

      expect(screen.getByText("Oggi")).toBeInTheDocument();
    });

    it("should display relative date for yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayMaterial: Material = {
        ...mockMaterial,
        updatedAt: yesterday,
      };

      render(<MaterialCard material={yesterdayMaterial} />);

      expect(screen.getByText("Ieri")).toBeInTheDocument();
    });

    it("should display days ago for recent dates", () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const recentMaterial: Material = {
        ...mockMaterial,
        updatedAt: threeDaysAgo,
      };

      render(<MaterialCard material={recentMaterial} />);

      expect(screen.getByText("3 giorni fa")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should be focusable", () => {
      render(<MaterialCard material={mockMaterial} />);

      const card = screen.getByRole("option");
      expect(card).toHaveAttribute("tabIndex", "0");
    });

    it("should have focus ring styles", () => {
      const { container } = render(<MaterialCard material={mockMaterial} />);

      expect(container.firstChild).toHaveClass(
        "focus:outline-none",
        "focus:ring-2",
      );
    });

    it("should include selection state in aria-label when selected", () => {
      render(
        <MaterialCard
          material={mockMaterial}
          isSelected={true}
          onSelect={vi.fn()}
        />,
      );

      const card = screen.getByRole("option");
      expect(card).toHaveAttribute(
        "aria-label",
        expect.stringContaining("selezionato"),
      );
    });

    it("should have aria-pressed on favorite button", () => {
      render(
        <MaterialCard
          material={mockMaterialWithFavorite}
          onToggleFavorite={vi.fn()}
        />,
      );

      const favoriteButton = screen.getByLabelText("Rimuovi dai preferiti");
      expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
    });

    it("should have aria-expanded on menu button", () => {
      render(<MaterialCard material={mockMaterial} onOpen={vi.fn()} />);

      const menuButton = screen.getByLabelText("Altre azioni");
      expect(menuButton).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(menuButton);
      expect(menuButton).toHaveAttribute("aria-expanded", "true");
    });

    it("should have aria-haspopup on menu button", () => {
      render(<MaterialCard material={mockMaterial} onOpen={vi.fn()} />);

      const menuButton = screen.getByLabelText("Altre azioni");
      expect(menuButton).toHaveAttribute("aria-haspopup", "menu");
    });
  });

  describe("Custom className", () => {
    it("should apply custom className", () => {
      const { container } = render(
        <MaterialCard material={mockMaterial} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
