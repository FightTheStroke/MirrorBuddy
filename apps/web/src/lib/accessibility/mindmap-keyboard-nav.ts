/**
 * @file mindmap-keyboard-nav.ts
 * @brief Keyboard accessibility for markmap-view (d3/SVG) mind maps — T2.10
 *
 * markmap-view (used by both `components/tools/markmap` and
 * `components/tools/interactive-markmap`) renders every node as a
 * `<g class="markmap-node" data-path="...">` with an expand/collapse
 * `<circle>` that only responds to mouse clicks — there is no Tab/Enter/
 * Arrow/Escape equivalent, so a keyboard-only student (or a Motor / Cerebral
 * Palsy profile, or anyone honoring the plain WCAG 2.1 AA keyboard
 * requirement) cannot use the mind map at all.
 *
 * This wires keyboard navigation onto the already-rendered DOM after
 * markmap-view finishes drawing — no change to the markmap-view/d3 rendering
 * internals required:
 *  - Tab / Shift+Tab: browser-native, follows `tabindex="0"` in DOM order.
 *  - Enter / Space: toggle expand/collapse (dispatches a click on the node's
 *    circle, which is what markmap-view's own handler listens for).
 *  - ArrowRight: expand (if collapsed) or move to the first child.
 *  - ArrowLeft: collapse (if expanded) or move to the parent.
 *  - ArrowDown / ArrowUp: move to the next / previous sibling node.
 *  - Escape: collapse the current node if expanded, else move to the parent.
 *  - Visible 3px focus outline (>= 3:1 contrast), color-adjusted for
 *    high-contrast mode.
 */

const FOCUS_OUTLINE_COLOR = "#1d4ed8"; // blue-700: >= 3:1 contrast on white and slate-900
const FOCUS_OUTLINE_COLOR_HIGH_CONTRAST = "#ffff00";

/** Direct child paths are `${parentPath}.N`; root paths have no dot. */
function getParentPath(path: string): string | null {
  const dotIndex = path.lastIndexOf(".");
  return dotIndex === -1 ? null : path.slice(0, dotIndex);
}

function isDirectChild(path: string, parentPath: string | null): boolean {
  if (parentPath === null) {
    return !path.includes(".");
  }
  return (
    path.startsWith(`${parentPath}.`) &&
    path.slice(parentPath.length + 1).indexOf(".") === -1
  );
}

export interface MindmapKeyboardNavOptions {
  isHighContrast?: boolean;
}

/**
 * Wire keyboard navigation + a visible focus indicator onto every rendered
 * mindmap node inside `svg`. Returns a cleanup function that removes all
 * listeners — call it before the SVG content is destroyed / re-rendered.
 */
export function applyMindmapKeyboardAccessibility(
  svg: SVGSVGElement,
  options: MindmapKeyboardNavOptions = {},
): () => void {
  const nodeGroups = Array.from(
    svg.querySelectorAll<SVGGElement>("g.markmap-node"),
  );
  const outlineColor = options.isHighContrast
    ? FOCUS_OUTLINE_COLOR_HIGH_CONTRAST
    : FOCUS_OUTLINE_COLOR;

  const pathToGroup = new Map<string, SVGGElement>();
  nodeGroups.forEach((group) => {
    const path = group.getAttribute("data-path");
    if (path) pathToGroup.set(path, group);
  });

  const findSibling = (
    path: string,
    direction: 1 | -1,
  ): SVGGElement | null => {
    const parentPath = getParentPath(path);
    const siblings = nodeGroups
      .filter((g) => {
        const p = g.getAttribute("data-path");
        return p !== null && isDirectChild(p, parentPath);
      })
      .sort((a, b) => {
        const ai = Number(a.getAttribute("data-path")?.split(".").pop());
        const bi = Number(b.getAttribute("data-path")?.split(".").pop());
        return ai - bi;
      });
    const currentIndex = siblings.findIndex(
      (g) => g.getAttribute("data-path") === path,
    );
    return siblings[currentIndex + direction] ?? null;
  };

  const findFirstChild = (path: string): SVGGElement | null =>
    pathToGroup.get(`${path}.0`) ?? null;

  const cleanups: Array<() => void> = [];

  nodeGroups.forEach((group, index) => {
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "treeitem");
    group.style.cursor = "pointer";

    const label =
      group.querySelector("text")?.textContent?.trim() ||
      group.querySelector("foreignObject")?.textContent?.trim() ||
      `Nodo ${index + 1}`;
    group.setAttribute("aria-label", label);

    const path = group.getAttribute("data-path");
    const circle = group.querySelector("circle");
    if (circle && path && pathToGroup.has(`${path}.0`)) {
      group.setAttribute(
        "aria-expanded",
        String(!group.classList.contains("markmap-fold")),
      );
    }

    const handleFocus = () => {
      group.style.outline = `3px solid ${outlineColor}`;
      group.style.outlineOffset = "2px";
    };
    const handleBlur = () => {
      group.style.outline = "none";
    };

    const toggle = (event: KeyboardEvent) => {
      circle?.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
        }),
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentPath = group.getAttribute("data-path");
      switch (event.key) {
        case "Enter":
        case " ":
        case "Spacebar":
          event.preventDefault();
          toggle(event);
          break;
        case "ArrowRight": {
          event.preventDefault();
          if (!currentPath) break;
          if (group.classList.contains("markmap-fold") && circle) {
            toggle(event);
          } else {
            findFirstChild(currentPath)?.focus();
          }
          break;
        }
        case "ArrowLeft": {
          event.preventDefault();
          if (!currentPath) break;
          if (!group.classList.contains("markmap-fold") && circle) {
            toggle(event);
          } else {
            const parentPath = getParentPath(currentPath);
            if (parentPath !== null) pathToGroup.get(parentPath)?.focus();
          }
          break;
        }
        case "ArrowDown":
          event.preventDefault();
          if (currentPath) findSibling(currentPath, 1)?.focus();
          break;
        case "ArrowUp":
          event.preventDefault();
          if (currentPath) findSibling(currentPath, -1)?.focus();
          break;
        case "Escape": {
          event.preventDefault();
          if (!currentPath) break;
          if (!group.classList.contains("markmap-fold") && circle) {
            // Collapse the current (expanded) node.
            toggle(event);
          } else {
            // Already collapsed / leaf: move focus up to the parent.
            const parentPath = getParentPath(currentPath);
            if (parentPath !== null) pathToGroup.get(parentPath)?.focus();
          }
          break;
        }
        default:
          break;
      }
    };

    group.addEventListener("focus", handleFocus);
    group.addEventListener("blur", handleBlur);
    group.addEventListener("keydown", handleKeyDown);

    cleanups.push(() => {
      group.removeEventListener("focus", handleFocus);
      group.removeEventListener("blur", handleBlur);
      group.removeEventListener("keydown", handleKeyDown);
    });
  });

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
