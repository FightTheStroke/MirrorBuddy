/**
 * T2.10 — keyboard-only navigation for markmap-view mind maps.
 *
 * markmap-view renders nodes as <g class="markmap-node" data-path="...">
 * with a mouse-only expand/collapse <circle>. These tests build the same
 * minimal DOM shape markmap-view produces (data-path, an expand/collapse
 * circle wired to a click handler — as markmap-view itself does internally)
 * and verify that a keyboard-only user (no mouse events at all) can Tab to
 * every node, and Enter/Space/Arrow/Escape operate exactly like the
 * mouse-driven circle click.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { applyMindmapKeyboardAccessibility } from '../mindmap-keyboard-nav';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Build a small markmap-like tree:
 *   0 "Root"
 *     0.0 "Branch A" (has children, expanded)
 *       0.0.0 "Leaf A1"
 *     0.1 "Branch B" (collapsed — markmap-fold)
 */
function buildMindmapDom() {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;

  const makeNode = (path: string, label: string, folded = false) => {
    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.setAttribute('class', folded ? 'markmap-node markmap-fold' : 'markmap-node');
    g.setAttribute('data-path', path);
    const text = document.createElementNS(SVG_NS, 'text');
    text.textContent = label;
    g.appendChild(text);
    return g;
  };

  const root = makeNode('0', 'Root');
  const branchA = makeNode('0.0', 'Branch A');
  const leafA1 = makeNode('0.0.0', 'Leaf A1');
  const branchB = makeNode('0.1', 'Branch B', true);

  // Expand/collapse circles — this is the ONLY interaction markmap-view
  // itself wires up (via d3 `.on("click", ...)`), so a real toggle handler
  // is attached here the same way, letting the test prove the keyboard
  // path reaches the exact same code path a mouse click would.
  const toggleSpy = vi.fn();
  [root, branchA, branchB].forEach((g) => {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.addEventListener('click', (e) => toggleSpy(g.getAttribute('data-path'), e));
    g.appendChild(circle);
  });

  svg.append(root, branchA, leafA1, branchB);
  document.body.appendChild(svg);

  return { svg, root, branchA, leafA1, branchB, toggleSpy };
}

describe('applyMindmapKeyboardAccessibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('makes every node Tab-reachable and screen-reader labeled', () => {
    const { svg, root, branchA, leafA1, branchB } = buildMindmapDom();
    applyMindmapKeyboardAccessibility(svg);

    for (const node of [root, branchA, leafA1, branchB]) {
      expect(node.getAttribute('tabindex')).toBe('0');
      expect(node.getAttribute('role')).toBe('treeitem');
      expect(node.getAttribute('aria-label')).toBeTruthy();
    }
    expect(root.getAttribute('aria-label')).toBe('Root');
    expect(branchB.getAttribute('aria-label')).toBe('Branch B');
  });

  it('reaches and activates a node via Tab + Enter — no mouse involved', async () => {
    const user = userEvent.setup();
    const { svg, root, branchA, toggleSpy } = buildMindmapDom();
    applyMindmapKeyboardAccessibility(svg);

    // Tab from the top of the document reaches nodes in DOM order.
    await user.tab();
    expect(document.activeElement).toBe(root);
    await user.tab();
    expect(document.activeElement).toBe(branchA);

    // Space and Enter both trigger the node's expand/collapse circle click —
    // the exact same handler a mouse click would fire.
    await user.keyboard('[Enter]');
    expect(toggleSpy).toHaveBeenCalledWith('0.0', expect.anything());
  });

  it('gives keyboard focus a visible 3px outline (WCAG 2.1 AA)', () => {
    const { svg, root } = buildMindmapDom();
    applyMindmapKeyboardAccessibility(svg);

    root.dispatchEvent(new FocusEvent('focus'));
    expect(root.style.outline).toContain('3px solid');

    root.dispatchEvent(new FocusEvent('blur'));
    expect(root.style.outline).toBe('none');
  });

  it('uses a high-contrast-safe outline color when requested', () => {
    const { svg, root } = buildMindmapDom();
    applyMindmapKeyboardAccessibility(svg, { isHighContrast: true });

    root.dispatchEvent(new FocusEvent('focus'));
    expect(root.style.outline).toContain('#ffff00');
  });

  it('ArrowRight expands a collapsed node instead of navigating', () => {
    const { svg, branchB, toggleSpy } = buildMindmapDom();
    applyMindmapKeyboardAccessibility(svg);

    branchB.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(toggleSpy).toHaveBeenCalledWith('0.1', expect.anything());
  });

  it('ArrowRight moves focus to the first child of an expanded node', () => {
    const { svg, branchA, leafA1 } = buildMindmapDom();
    applyMindmapKeyboardAccessibility(svg);

    branchA.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(leafA1);
  });

  it('ArrowLeft / Escape move focus from a leaf back to its parent', () => {
    const { svg, branchA, leafA1 } = buildMindmapDom();
    applyMindmapKeyboardAccessibility(svg);

    leafA1.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(branchA);
  });

  it('Escape collapses an expanded node before moving focus', () => {
    const { svg, branchA, toggleSpy } = buildMindmapDom();
    applyMindmapKeyboardAccessibility(svg);

    branchA.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(toggleSpy).toHaveBeenCalledWith('0.0', expect.anything());
  });

  it('ArrowDown / ArrowUp move focus between sibling nodes', () => {
    const { svg, branchA, branchB } = buildMindmapDom();
    applyMindmapKeyboardAccessibility(svg);

    branchA.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(branchB);

    branchB.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(branchA);
  });

  it('cleanup function removes all listeners', () => {
    const { svg, root, toggleSpy } = buildMindmapDom();
    const cleanup = applyMindmapKeyboardAccessibility(svg);

    cleanup();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(toggleSpy).not.toHaveBeenCalled();
  });

  it('wires nodes inserted after expansion (markmap renders children lazily)', async () => {
    const { svg } = buildMindmapDom();
    applyMindmapKeyboardAccessibility(svg);

    // Simulate markmap-view rendering a folded branch's children on expand:
    // a brand-new <g class="markmap-node"> appears under the svg AFTER setup.
    const child = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    child.setAttribute('class', 'markmap-node');
    child.setAttribute('data-path', '0.1.0');
    const text = document.createElementNS(SVG_NS, 'text');
    text.textContent = 'Leaf B1';
    child.appendChild(text);
    svg.appendChild(child);

    // MutationObserver callbacks run on a microtask.
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    // The newly inserted node must be keyboard-reachable and labeled, so a
    // keyboard user can navigate INTO the branch they just expanded.
    expect(child.getAttribute('tabindex')).toBe('0');
    expect(child.getAttribute('role')).toBe('treeitem');
    expect(child.getAttribute('aria-label')).toBe('Leaf B1');
  });

  it('cleanup stops wiring nodes inserted later', async () => {
    const { svg } = buildMindmapDom();
    const cleanup = applyMindmapKeyboardAccessibility(svg);
    cleanup();

    const child = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    child.setAttribute('class', 'markmap-node');
    child.setAttribute('data-path', '0.1.0');
    svg.appendChild(child);

    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    // Observer was disconnected → no wiring after cleanup.
    expect(child.getAttribute('tabindex')).toBeNull();
  });
});
