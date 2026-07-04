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
 *
 * Expansion re-render: markmap-view renders a folded branch's children only
 * when it is expanded, so a one-time snapshot would leave those later-inserted
 * `g.markmap-node` elements un-wired — a keyboard user could open a branch but
 * not navigate into it. A MutationObserver re-wires newly inserted nodes, and
 * all navigation reads the LIVE DOM (not a stale snapshot) so parent/child/
 * sibling movement stays correct across expand/collapse.
 */

const FOCUS_OUTLINE_COLOR = '#1d4ed8'; // blue-700: >= 3:1 contrast on white and slate-900
const FOCUS_OUTLINE_COLOR_HIGH_CONTRAST = '#ffff00';

/** Direct child paths are `${parentPath}.N`; root paths have no dot. */
function getParentPath(path: string): string | null {
  const dotIndex = path.lastIndexOf('.');
  return dotIndex === -1 ? null : path.slice(0, dotIndex);
}

function isDirectChild(path: string, parentPath: string | null): boolean {
  if (parentPath === null) {
    return !path.includes('.');
  }
  return path.startsWith(`${parentPath}.`) && path.slice(parentPath.length + 1).indexOf('.') === -1;
}

export interface MindmapKeyboardNavOptions {
  isHighContrast?: boolean;
}

/**
 * Wire keyboard navigation + a visible focus indicator onto every rendered
 * mindmap node inside `svg`, and keep wiring nodes that markmap-view inserts
 * later (e.g. when a folded branch is expanded). Returns a cleanup function
 * that removes all listeners and stops observing — call it before the SVG
 * content is destroyed / re-rendered.
 */
export function applyMindmapKeyboardAccessibility(
  svg: SVGSVGElement,
  options: MindmapKeyboardNavOptions = {},
): () => void {
  const outlineColor = options.isHighContrast
    ? FOCUS_OUTLINE_COLOR_HIGH_CONTRAST
    : FOCUS_OUTLINE_COLOR;

  // Read the live DOM every time so navigation follows the CURRENT tree, not a
  // snapshot taken before a branch was expanded.
  const liveGroups = (): SVGGElement[] =>
    Array.from(svg.querySelectorAll<SVGGElement>('g.markmap-node'));

  const groupByPath = (path: string): SVGGElement | null => {
    for (const g of liveGroups()) {
      if (g.getAttribute('data-path') === path) return g;
    }
    return null;
  };

  const findSibling = (path: string, direction: 1 | -1): SVGGElement | null => {
    const parentPath = getParentPath(path);
    const siblings = liveGroups()
      .filter((g) => {
        const p = g.getAttribute('data-path');
        return p !== null && isDirectChild(p, parentPath);
      })
      .sort((a, b) => {
        const ai = Number(a.getAttribute('data-path')?.split('.').pop());
        const bi = Number(b.getAttribute('data-path')?.split('.').pop());
        return ai - bi;
      });
    const currentIndex = siblings.findIndex((g) => g.getAttribute('data-path') === path);
    return siblings[currentIndex + direction] ?? null;
  };

  const findFirstChild = (path: string): SVGGElement | null => groupByPath(`${path}.0`);

  // Track wiring per node so re-runs (via the observer) never double-bind, and
  // so cleanup can detach every listener.
  const wired = new WeakSet<SVGGElement>();
  const cleanupByNode = new WeakMap<SVGGElement, () => void>();
  const wiredNodes = new Set<SVGGElement>();

  const wireNode = (group: SVGGElement): void => {
    if (wired.has(group)) return;
    wired.add(group);
    wiredNodes.add(group);

    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'treeitem');
    group.style.cursor = 'pointer';

    if (!group.getAttribute('aria-label')) {
      const label =
        group.querySelector('text')?.textContent?.trim() ||
        group.querySelector('foreignObject')?.textContent?.trim() ||
        `Nodo ${wiredNodes.size}`;
      group.setAttribute('aria-label', label);
    }

    const circle = group.querySelector('circle');
    // markmap-view only draws an expand/collapse circle on nodes that have
    // children — use it as the "expandable" signal so aria-expanded is set
    // even while the branch is still folded (children not yet in the DOM).
    if (circle) {
      group.setAttribute('aria-expanded', String(!group.classList.contains('markmap-fold')));
    }

    const handleFocus = () => {
      group.style.outline = `3px solid ${outlineColor}`;
      group.style.outlineOffset = '2px';
    };
    const handleBlur = () => {
      group.style.outline = 'none';
    };

    const toggle = (event: KeyboardEvent) => {
      group.querySelector('circle')?.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
        }),
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentPath = group.getAttribute('data-path');
      const hasCircle = !!group.querySelector('circle');
      switch (event.key) {
        case 'Enter':
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          toggle(event);
          break;
        case 'ArrowRight': {
          event.preventDefault();
          if (!currentPath) break;
          if (group.classList.contains('markmap-fold') && hasCircle) {
            toggle(event);
          } else {
            findFirstChild(currentPath)?.focus();
          }
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          if (!currentPath) break;
          if (!group.classList.contains('markmap-fold') && hasCircle) {
            toggle(event);
          } else {
            const parentPath = getParentPath(currentPath);
            if (parentPath !== null) groupByPath(parentPath)?.focus();
          }
          break;
        }
        case 'ArrowDown':
          event.preventDefault();
          if (currentPath) findSibling(currentPath, 1)?.focus();
          break;
        case 'ArrowUp':
          event.preventDefault();
          if (currentPath) findSibling(currentPath, -1)?.focus();
          break;
        case 'Escape': {
          event.preventDefault();
          if (!currentPath) break;
          if (!group.classList.contains('markmap-fold') && hasCircle) {
            // Collapse the current (expanded) node.
            toggle(event);
          } else {
            // Already collapsed / leaf: move focus up to the parent.
            const parentPath = getParentPath(currentPath);
            if (parentPath !== null) groupByPath(parentPath)?.focus();
          }
          break;
        }
        default:
          break;
      }
    };

    group.addEventListener('focus', handleFocus);
    group.addEventListener('blur', handleBlur);
    group.addEventListener('keydown', handleKeyDown);

    cleanupByNode.set(group, () => {
      group.removeEventListener('focus', handleFocus);
      group.removeEventListener('blur', handleBlur);
      group.removeEventListener('keydown', handleKeyDown);
    });
  };

  const wireAll = (): void => {
    for (const group of liveGroups()) wireNode(group);
  };

  // Wire everything already rendered, then keep wiring nodes markmap-view
  // inserts on expand (childList mutations anywhere under the svg).
  wireAll();

  let observer: MutationObserver | null = null;
  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => wireAll());
    observer.observe(svg, { childList: true, subtree: true });
  }

  return () => {
    observer?.disconnect();
    for (const group of wiredNodes) cleanupByNode.get(group)?.();
    wiredNodes.clear();
  };
}
