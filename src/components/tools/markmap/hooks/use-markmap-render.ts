import { useEffect, useCallback, useState, type RefObject } from 'react';
import type { Markmap } from 'markmap-view';
import { logger } from '@/lib/logger';
import type { AccessibilitySettings } from '@/lib/accessibility/accessibility-store';
import type { MindmapNode } from '../types';
import { nodesToMarkdown } from '../utils';
import {
  convertParentIdToChildren,
  detectNodeFormat,
  type FlatNode,
} from '@/lib/tools/mindmap-utils';

interface UseMarkmapRenderProps {
  svgRef: RefObject<SVGSVGElement | null> | RefObject<SVGSVGElement>;
  containerRef: RefObject<HTMLDivElement | null> | RefObject<HTMLDivElement>;
  markmapRef: RefObject<Markmap | null> | RefObject<Markmap>;
  markdown?: string;
  nodes?: MindmapNode[];
  title: string;
  settings: AccessibilitySettings;
  accessibilityMode: boolean;
}

export function useMarkmapRender({
  svgRef,
  containerRef,
  markmapRef,
  markdown,
  nodes,
  title,
  settings,
  accessibilityMode,
}: UseMarkmapRenderProps) {
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  // Get the markdown content - ADR 0020: Handle both parentId and children formats
  const getMarkdownContent = useCallback((): string => {
    // Prefer pre-generated markdown if available
    if (markdown) {
      return markdown;
    }

    if (nodes && nodes.length > 0) {
      // Detect node format and convert if needed
      const format = detectNodeFormat(nodes);

      if (format === 'parentId') {
        // Convert parentId format to children format for rendering
        const treeNodes = convertParentIdToChildren(nodes as FlatNode[]);
        return nodesToMarkdown(treeNodes, title);
      }

      // Already in children format or unknown (treat as children)
      return nodesToMarkdown(nodes, title);
    }

    return `# ${title}\n## No content`;
  }, [markdown, nodes, title]);

  // Generate accessible description
  const generateTextDescription = useCallback((): string => {
    if (nodes && nodes.length > 0) {
      const describeNode = (node: MindmapNode): string => {
        let desc = node.label;
        if (node.children && node.children.length > 0) {
          desc += ': ' + node.children.map(c => describeNode(c)).join(', ');
        }
        return desc;
      };
      return `${title} con i seguenti rami: ${nodes.map(n => describeNode(n)).join('; ')}`;
    }
    return `Mappa mentale: ${title}`;
  }, [nodes, title]);

  // Render mindmap
  useEffect(() => {
    const renderMindmap = async () => {
      if (!svgRef.current || !containerRef.current) return;

      // FIX BUG 16: Check container dimensions before rendering to prevent SVGLength error
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        // Container not yet laid out, wait for next frame
        requestAnimationFrame(() => renderMindmap());
        return;
      }

      try {
        setError(null);
        setRendered(false);

        // Set explicit dimensions on SVG to prevent SVGLength error
        svgRef.current.setAttribute('width', String(rect.width));
        svgRef.current.setAttribute('height', String(rect.height - 60)); // Account for toolbar

        // Clear previous content
        svgRef.current.innerHTML = '';

        // Lazy-load markmap-lib
        const { Transformer } = await import('markmap-lib');
        const transformer = new Transformer();

        // Get markdown and transform to markmap data
        const content = getMarkdownContent();
        const { root } = transformer.transform(content);

        // Determine font family based on accessibility settings
        const fontFamily = settings.dyslexiaFont || accessibilityMode
          ? 'OpenDyslexic, Comic Sans MS, sans-serif'
          : 'Arial, Helvetica, sans-serif';

        // Determine colors based on accessibility settings
        const isHighContrast = settings.highContrast || accessibilityMode;

        // Create or update markmap
        if (markmapRef.current) {
          markmapRef.current.destroy();
        }

        // Lazy-load markmap-view
        const { Markmap: MarkmapClass } = await import('markmap-view');

        markmapRef.current = MarkmapClass.create(svgRef.current, {
          autoFit: true,
          duration: 300,
          maxWidth: 280,
          paddingX: 16,
          spacingVertical: 8,
          spacingHorizontal: 100,
          initialExpandLevel: 3, // Start with first 3 levels expanded, rest collapsed
          zoom: true, // Enable zoom/pan
          pan: true,  // Enable panning
          color: (node) => {
            if (isHighContrast) {
              // High contrast colors
              const colors = ['#ffff00', '#00ffff', '#ff00ff', '#00ff00', '#ff8000'];
              return colors[node.state?.depth % colors.length] || '#ffffff';
            }
            // Normal theme colors
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
            return colors[node.state?.depth % colors.length] || '#64748b';
          },
        }, root);

        // Apply custom styles after render
        setTimeout(() => {
          if (svgRef.current) {
            // Apply font to all text elements
            const textElements = svgRef.current.querySelectorAll('text, foreignObject');
            textElements.forEach((el) => {
              if (el instanceof SVGElement || el instanceof HTMLElement) {
                el.style.fontFamily = fontFamily;
                if (settings.largeText) {
                  el.style.fontSize = '16px';
                }
              }
            });

            // C-20 FIX: Style expand/collapse circles for better visibility and ensure they're clickable
            const circles = svgRef.current.querySelectorAll('circle');
            circles.forEach((circle) => {
              if (circle instanceof SVGCircleElement) {
                circle.style.cursor = 'pointer';
                circle.style.pointerEvents = 'auto';
                // Make circles larger and more visible
                const r = parseFloat(circle.getAttribute('r') || '4');
                if (r < 6) {
                  circle.setAttribute('r', '6');
                }
                // Ensure stroke is visible
                if (!circle.getAttribute('stroke')) {
                  circle.setAttribute('stroke', isHighContrast ? '#ffffff' : '#475569');
                  circle.setAttribute('stroke-width', '2');
                }
              }
            });

            // C-20 FIX: Ensure all g elements (node groups) have pointer-events enabled
            const nodeGroups = svgRef.current.querySelectorAll('g.markmap-node');
            nodeGroups.forEach((g) => {
              if (g instanceof SVGGElement) {
                g.style.pointerEvents = 'auto';
                g.style.cursor = 'pointer';
              }
            });

            // High contrast background
            if (isHighContrast) {
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('width', '100%');
              rect.setAttribute('height', '100%');
              rect.setAttribute('fill', '#000000');
              svgRef.current.insertBefore(rect, svgRef.current.firstChild);
            }
          }
        }, 100);

        // Add ARIA attributes
        svgRef.current.setAttribute('role', 'img');
        svgRef.current.setAttribute('aria-label', `Mappa mentale: ${title}`);

        // Add title and desc for screen readers
        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        titleEl.textContent = `Mappa mentale: ${title}`;
        svgRef.current.insertBefore(titleEl, svgRef.current.firstChild);

        const descEl = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
        descEl.textContent = generateTextDescription();
        svgRef.current.insertBefore(descEl, svgRef.current.firstChild?.nextSibling || null);

        setRendered(true);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        logger.error('MarkMap render error', { error: String(err) });
      }
    };

    renderMindmap();
  }, [
    markdown,
    nodes,
    title,
    settings.dyslexiaFont,
    settings.highContrast,
    settings.largeText,
    accessibilityMode,
    getMarkdownContent,
    generateTextDescription,
    svgRef,
    containerRef,
    markmapRef,
  ]);

  return { error, rendered };
}
