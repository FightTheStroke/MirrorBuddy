/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidebarNavigation, Collection, TagItem } from "../sidebar-navigation";

// Mock next-intl to return Italian translations
// Note: sidebar-navigation uses camelCase keys per ADR 0091
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "sidebar.navigationAriaLabel": "Navigazione materiali",
      "sidebar.quickFiltersTitle": "Filtri rapidi",
      "sidebar.quickFiltersAriaLabel": "Filtri rapidi",
      "sidebar.recent": "Recenti",
      "sidebar.favorites": "Preferiti",
      "sidebar.archived": "Archiviati",
      "sidebar.collectionsTitle": "Cartelle",
      "sidebar.collectionsAriaLabel": "Cartelle",
      "sidebar.noCollections": "Nessuna cartella",
      "sidebar.tagsTitle": "Tag",
      "sidebar.tagsAriaLabel": "Tag",
      "sidebar.noTags": "Nessun tag",
      "sidebar.createCollectionAriaLabel": "Crea nuova cartella",
      "sidebar.createTagAriaLabel": "Crea nuovo tag",
    };
    return translations[key] || key;
  },
}));

const mockCollections: Collection[] = [
  {
    id: "col1",
    name: "Matematica",
    count: 5,
    children: [
      { id: "col1-1", name: "Algebra", count: 2, parentId: "col1" },
      { id: "col1-2", name: "Geometria", count: 3, parentId: "col1" },
    ],
  },
  {
    id: "col2",
    name: "Scienze",
    count: 3,
  },
];

const mockTags: TagItem[] = [
  { id: "tag1", name: "Importante", color: "red", count: 4 },
  { id: "tag2", name: "Da rivedere", color: "yellow", count: 2 },
  { id: "tag3", name: "Esame", color: "green", count: 6 },
];

describe("SidebarNavigation", () => {
  describe("Basic Rendering", () => {
    it("should render navigation element", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute("aria-label", "Navigazione materiali");
    });

    it("should render quick filters section", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      expect(screen.getByText("Filtri rapidi")).toBeInTheDocument();
      expect(screen.getByText("Recenti")).toBeInTheDocument();
      expect(screen.getByText("Preferiti")).toBeInTheDocument();
    });

    it("should render collections section header", () => {
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      expect(screen.getByText("Cartelle")).toBeInTheDocument();
    });

    it("should render tags section header", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={mockTags}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      expect(screen.getByText("Tag")).toBeInTheDocument();
    });

    it("should show empty state for collections", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      expect(screen.getByText("Nessuna cartella")).toBeInTheDocument();
    });

    it("should show empty state for tags", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      expect(screen.getByText("Nessun tag")).toBeInTheDocument();
    });
  });

  describe("Collections", () => {
    it("should render all collections", () => {
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      expect(screen.getByText("Matematica")).toBeInTheDocument();
      expect(screen.getByText("Scienze")).toBeInTheDocument();
    });

    it("should show collection count", () => {
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      expect(screen.getByText("5")).toBeInTheDocument(); // Matematica count
      expect(screen.getByText("3")).toBeInTheDocument(); // Scienze count
    });

    it("should call onSelectCollection when collection is clicked", () => {
      const onSelectCollection = vi.fn();
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={onSelectCollection}
          onToggleTag={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Matematica"));
      expect(onSelectCollection).toHaveBeenCalledWith("col1");
    });

    it("should highlight selected collection", () => {
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          selectedCollectionId="col1"
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      const matematicaItem = screen
        .getByText("Matematica")
        .closest('[role="treeitem"]');
      expect(matematicaItem).toHaveAttribute("aria-selected", "true");
    });

    it("should expand collection to show children", () => {
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      // Children not visible initially
      expect(screen.queryByText("Algebra")).not.toBeInTheDocument();

      // Click expand button
      const expandButton = screen.getByLabelText("Apri cartella");
      fireEvent.click(expandButton);

      // Children visible now
      expect(screen.getByText("Algebra")).toBeInTheDocument();
      expect(screen.getByText("Geometria")).toBeInTheDocument();
    });

    it("should collapse expanded collection", () => {
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      // Expand
      const expandButton = screen.getByLabelText("Apri cartella");
      fireEvent.click(expandButton);
      expect(screen.getByText("Algebra")).toBeInTheDocument();

      // Collapse
      const collapseButton = screen.getByLabelText("Chiudi cartella");
      fireEvent.click(collapseButton);
      expect(screen.queryByText("Algebra")).not.toBeInTheDocument();
    });
  });

  describe("Tags", () => {
    it("should render all tags", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={mockTags}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      expect(screen.getByText("Importante")).toBeInTheDocument();
      expect(screen.getByText("Da rivedere")).toBeInTheDocument();
      expect(screen.getByText("Esame")).toBeInTheDocument();
    });

    it("should show tag count in parentheses", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={mockTags}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      expect(screen.getByText("(4)")).toBeInTheDocument();
      expect(screen.getByText("(2)")).toBeInTheDocument();
      expect(screen.getByText("(6)")).toBeInTheDocument();
    });

    it("should call onToggleTag when tag is clicked", () => {
      const onToggleTag = vi.fn();
      render(
        <SidebarNavigation
          collections={[]}
          tags={mockTags}
          onSelectCollection={vi.fn()}
          onToggleTag={onToggleTag}
        />,
      );

      fireEvent.click(screen.getByText("Importante"));
      expect(onToggleTag).toHaveBeenCalledWith("tag1");
    });

    it("should highlight selected tags", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={mockTags}
          selectedTagIds={["tag1", "tag3"]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      const importanteTag = screen.getByText("Importante").closest("button");
      const esameTag = screen.getByText("Esame").closest("button");
      const daRivedereTag = screen.getByText("Da rivedere").closest("button");

      expect(importanteTag).toHaveAttribute("aria-checked", "true");
      expect(esameTag).toHaveAttribute("aria-checked", "true");
      expect(daRivedereTag).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Quick Filters", () => {
    it("should call onSelectCollection with null for Recenti", () => {
      const onSelectCollection = vi.fn();
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={onSelectCollection}
          onToggleTag={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Recenti"));
      expect(onSelectCollection).toHaveBeenCalledWith(null);
    });

    it("should call onSelectCollection with favorites for Preferiti", () => {
      const onSelectCollection = vi.fn();
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={onSelectCollection}
          onToggleTag={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("Preferiti"));
      expect(onSelectCollection).toHaveBeenCalledWith("favorites");
    });

    it("should render archived filter when onToggleArchived is provided", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
          onToggleArchived={vi.fn()}
        />,
      );

      expect(screen.getByText("Archiviati")).toBeInTheDocument();
    });

    it("should call onToggleArchived when clicked", () => {
      const onToggleArchived = vi.fn();
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
          onToggleArchived={onToggleArchived}
        />,
      );

      fireEvent.click(screen.getByText("Archiviati"));
      expect(onToggleArchived).toHaveBeenCalled();
    });

    it("should highlight archived filter when showArchived is true", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
          showArchived={true}
          onToggleArchived={vi.fn()}
        />,
      );

      const archivedItem = screen
        .getByText("Archiviati")
        .closest('[role="treeitem"]');
      expect(archivedItem).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Create Actions", () => {
    it("should show create collection button when callback is provided", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
          onCreateCollection={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("Crea nuova cartella")).toBeInTheDocument();
    });

    it("should call onCreateCollection when button is clicked", () => {
      const onCreateCollection = vi.fn();
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
          onCreateCollection={onCreateCollection}
        />,
      );

      fireEvent.click(screen.getByLabelText("Crea nuova cartella"));
      expect(onCreateCollection).toHaveBeenCalled();
    });

    it("should show create tag button when callback is provided", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
          onCreateTag={vi.fn()}
        />,
      );

      expect(screen.getByLabelText("Crea nuovo tag")).toBeInTheDocument();
    });

    it("should call onCreateTag when button is clicked", () => {
      const onCreateTag = vi.fn();
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
          onCreateTag={onCreateTag}
        />,
      );

      fireEvent.click(screen.getByLabelText("Crea nuovo tag"));
      expect(onCreateTag).toHaveBeenCalled();
    });
  });

  describe("Keyboard Navigation", () => {
    it("should expand collection on ArrowRight key", () => {
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      const matematicaButton = screen
        .getByText("Matematica")
        .closest("button")!;
      fireEvent.keyDown(matematicaButton, { key: "ArrowRight" });

      expect(screen.getByText("Algebra")).toBeInTheDocument();
    });

    it("should collapse collection on ArrowLeft key", () => {
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      // First expand
      const expandButton = screen.getByLabelText("Apri cartella");
      fireEvent.click(expandButton);

      // Then collapse with keyboard
      const matematicaButton = screen
        .getByText("Matematica")
        .closest("button")!;
      fireEvent.keyDown(matematicaButton, { key: "ArrowLeft" });

      expect(screen.queryByText("Algebra")).not.toBeInTheDocument();
    });

    it("should select on Enter key", () => {
      const onSelectCollection = vi.fn();
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={onSelectCollection}
          onToggleTag={vi.fn()}
        />,
      );

      const matematicaButton = screen
        .getByText("Matematica")
        .closest("button")!;
      fireEvent.keyDown(matematicaButton, { key: "Enter" });

      expect(onSelectCollection).toHaveBeenCalledWith("col1");
    });

    it("should select on Space key", () => {
      const onSelectCollection = vi.fn();
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={onSelectCollection}
          onToggleTag={vi.fn()}
        />,
      );

      const matematicaButton = screen
        .getByText("Matematica")
        .closest("button")!;
      fireEvent.keyDown(matematicaButton, { key: " " });

      expect(onSelectCollection).toHaveBeenCalledWith("col1");
    });
  });

  describe("Accessibility", () => {
    it("should have tree role on collections", () => {
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      const tree = screen.getByRole("tree", { name: "Cartelle" });
      expect(tree).toBeInTheDocument();
    });

    it("should have treeitem role on collection items", () => {
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      const items = screen.getAllByRole("treeitem");
      expect(items.length).toBeGreaterThan(0);
    });

    it("should have aria-expanded on expandable items", () => {
      render(
        <SidebarNavigation
          collections={mockCollections}
          tags={[]}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      const matematicaItem = screen
        .getByText("Matematica")
        .closest('[role="treeitem"]');
      expect(matematicaItem).toHaveAttribute("aria-expanded", "false");
    });

    it("should have checkbox role on tags", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={mockTags}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(3);
    });

    it("should have group role on tag container", () => {
      render(
        <SidebarNavigation
          collections={[]}
          tags={mockTags}
          onSelectCollection={vi.fn()}
          onToggleTag={vi.fn()}
        />,
      );

      const group = screen.getByRole("group", { name: "Tag" });
      expect(group).toBeInTheDocument();
    });
  });
});
