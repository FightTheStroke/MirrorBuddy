/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidebarNavigation, Collection, TagItem } from "../sidebar-navigation";
import { getTranslation } from "@/test/i18n-helpers";

// Mock next-intl to return Italian translations dynamically from actual i18n files
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    // Map component keys to actual translation paths
    const keyMap: Record<string, string> = {
      "sidebar.navigationAriaLabel":
        "education.knowledgeHub.sidebar.navigationAriaLabel",
      "sidebar.quickFiltersTitle":
        "education.knowledgeHub.sidebar.quickFiltersTitle",
      "sidebar.quickFiltersAriaLabel":
        "education.knowledgeHub.sidebar.quickFiltersAriaLabel",
      "sidebar.recent": "education.knowledgeHub.sidebar.recent",
      "sidebar.favorites": "education.knowledgeHub.sidebar.favorites",
      "sidebar.archived": "education.knowledgeHub.sidebar.archived",
      "sidebar.collectionsTitle":
        "education.knowledgeHub.sidebar.collectionsTitle",
      "sidebar.collectionsAriaLabel":
        "education.knowledgeHub.sidebar.collectionsAriaLabel",
      "sidebar.noCollections": "education.knowledgeHub.sidebar.noCollections",
      "sidebar.tagsTitle": "education.knowledgeHub.sidebar.tagsTitle",
      "sidebar.tagsAriaLabel": "education.knowledgeHub.sidebar.tagsAriaLabel",
      "sidebar.noTags": "education.knowledgeHub.sidebar.noTags",
      "sidebar.createCollectionAriaLabel":
        "education.knowledgeHub.sidebar.createCollectionAriaLabel",
      "sidebar.createTagAriaLabel":
        "education.knowledgeHub.sidebar.createTagAriaLabel",
    };
    const translationKey = keyMap[key];
    if (translationKey) {
      return getTranslation(translationKey);
    }
    return key;
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
      expect(nav).toHaveAttribute(
        "aria-label",
        getTranslation("education.knowledgeHub.sidebar.navigationAriaLabel"),
      );
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

      expect(
        screen.getByText(
          getTranslation("education.knowledgeHub.sidebar.quickFiltersTitle"),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          getTranslation("education.knowledgeHub.sidebar.recent"),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          getTranslation("education.knowledgeHub.sidebar.favorites"),
        ),
      ).toBeInTheDocument();
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

      expect(
        screen.getByText(
          getTranslation("education.knowledgeHub.sidebar.collectionsTitle"),
        ),
      ).toBeInTheDocument();
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

      expect(
        screen.getByText(
          getTranslation("education.knowledgeHub.sidebar.tagsTitle"),
        ),
      ).toBeInTheDocument();
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

      expect(
        screen.getByText(
          getTranslation("education.knowledgeHub.sidebar.noCollections"),
        ),
      ).toBeInTheDocument();
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

      expect(
        screen.getByText(
          getTranslation("education.knowledgeHub.sidebar.noTags"),
        ),
      ).toBeInTheDocument();
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

      // Collections use mock data names (not i18n)
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

      // Find the treeitem with aria-expanded="false" and click its chevron button
      const treeItems = screen.getAllByRole("treeitem");
      const expandableItem = treeItems.find(
        (item) => item.getAttribute("aria-expanded") === "false",
      );
      const expandButton = expandableItem?.querySelector("button");
      if (expandButton) fireEvent.click(expandButton);

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

      // Find the treeitem with aria-expanded="false" and click its chevron button
      const treeItems = screen.getAllByRole("treeitem");
      const expandableItem = treeItems.find(
        (item) => item.getAttribute("aria-expanded") === "false",
      );
      const expandButton = expandableItem?.querySelector("button");
      if (expandButton) fireEvent.click(expandButton);
      expect(screen.getByText("Algebra")).toBeInTheDocument();

      // Collapse - find item with aria-expanded="true" and click its chevron button
      const expandedItem = screen
        .getAllByRole("treeitem")
        .find((item) => item.getAttribute("aria-expanded") === "true");
      const collapseButton = expandedItem?.querySelector("button");
      if (collapseButton) fireEvent.click(collapseButton);
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

      // Tags use mock data names (not i18n)
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
    it("should call onSelectCollection with null for Recent filter", () => {
      const onSelectCollection = vi.fn();
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={onSelectCollection}
          onToggleTag={vi.fn()}
        />,
      );

      fireEvent.click(
        screen.getByText(
          getTranslation("education.knowledgeHub.sidebar.recent"),
        ),
      );
      expect(onSelectCollection).toHaveBeenCalledWith(null);
    });

    it("should call onSelectCollection with favorites for Favorites filter", () => {
      const onSelectCollection = vi.fn();
      render(
        <SidebarNavigation
          collections={[]}
          tags={[]}
          onSelectCollection={onSelectCollection}
          onToggleTag={vi.fn()}
        />,
      );

      fireEvent.click(
        screen.getByText(
          getTranslation("education.knowledgeHub.sidebar.favorites"),
        ),
      );
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

      expect(
        screen.getByText(
          getTranslation("education.knowledgeHub.sidebar.archived"),
        ),
      ).toBeInTheDocument();
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

      fireEvent.click(
        screen.getByText(
          getTranslation("education.knowledgeHub.sidebar.archived"),
        ),
      );
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
        .getByText(getTranslation("education.knowledgeHub.sidebar.archived"))
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

      expect(
        screen.getByLabelText(
          getTranslation(
            "education.knowledgeHub.sidebar.createCollectionAriaLabel",
          ),
        ),
      ).toBeInTheDocument();
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

      fireEvent.click(
        screen.getByLabelText(
          getTranslation(
            "education.knowledgeHub.sidebar.createCollectionAriaLabel",
          ),
        ),
      );
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

      expect(
        screen.getByLabelText(
          getTranslation("education.knowledgeHub.sidebar.createTagAriaLabel"),
        ),
      ).toBeInTheDocument();
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

      fireEvent.click(
        screen.getByLabelText(
          getTranslation("education.knowledgeHub.sidebar.createTagAriaLabel"),
        ),
      );
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

      // First expand using treeitem-based selector
      const treeItems = screen.getAllByRole("treeitem");
      const expandableItem = treeItems.find(
        (item) => item.getAttribute("aria-expanded") === "false",
      );
      const expandButton = expandableItem?.querySelector("button");
      if (expandButton) fireEvent.click(expandButton);

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

      const tree = screen.getByRole("tree", {
        name: getTranslation(
          "education.knowledgeHub.sidebar.collectionsAriaLabel",
        ),
      });
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

      const group = screen.getByRole("group", {
        name: getTranslation("education.knowledgeHub.sidebar.tagsAriaLabel"),
      });
      expect(group).toBeInTheDocument();
    });
  });
});
