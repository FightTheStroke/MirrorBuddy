import { useCallback, useRef, useEffect } from 'react';
import { Markmap } from 'markmap-view';
import { Transformer } from 'markmap-lib';
import { logger } from '@/lib/logger';
import { useAccessibilityStore } from '@/lib/accessibility/accessibility-store';
import { clearSvgChildren, countNodes } from '../utils';

const transformer = new Transformer();

export function useMindmapRenderer(svgRef: React.RefObject<SVGSVGElement | null>) {
  const markmapRef = useRef<Markmap | null>(null);
  const { settings } = useAccessibilityStore();
  const renderMindmapRef = useRef<((content: string, animate?: boolean) => void) | null>(null);

  const renderMindmap = useCallback(
    (content: string, animate = true) => {
      if (!svgRef.current || !content.trim()) return;

      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(() => {
          if (renderMindmapRef.current) renderMindmapRef.current(content, animate);
        });
        return;
      }

      svg.setAttribute('width', String(rect.width));
      svg.setAttribute('height', String(rect.height));

      try {
        const { root } = transformer.transform(content);

        const fontFamily =
          settings.dyslexiaFont
            ? 'OpenDyslexic, Comic Sans MS, sans-serif'
            : 'Arial, Helvetica, sans-serif';

        const isHighContrast = settings.highContrast;

        if (markmapRef.current) {
          markmapRef.current.setData(root);
          markmapRef.current.fit();
        } else {
          clearSvgChildren(svgRef.current);

          markmapRef.current = Markmap.create(
            svgRef.current,
            {
              autoFit: true,
              duration: animate ? 500 : 0,
              maxWidth: 280,
              paddingX: 16,
              spacingVertical: 8,
              spacingHorizontal: 60,
              color: (node) => {
                if (isHighContrast) {
                  const colors = ['#ffff00', '#00ffff', '#ff00ff', '#00ff00', '#ff8000'];
                  return colors[node.state?.depth % colors.length] || '#ffffff';
                }
                const colors = [
                  '#3b82f6',
                  '#10b981',
                  '#f59e0b',
                  '#ef4444',
                  '#8b5cf6',
                  '#ec4899',
                ];
                return colors[node.state?.depth % colors.length] || '#64748b';
              },
            },
            root
          );

          setTimeout(() => {
            if (svgRef.current) {
              const textElements = svgRef.current.querySelectorAll('text, foreignObject');
              textElements.forEach((el) => {
                if (el instanceof SVGElement || el instanceof HTMLElement) {
                  el.style.fontFamily = fontFamily;
                  if (settings.largeText) {
                    el.style.fontSize = '15px';
                  }
                }
              });
            }
          }, 100);
        }

        return countNodes(content);
      } catch (err) {
        logger.error('MindMapLive render error', { error: String(err) });
        return 0;
      }
    },
    [settings.dyslexiaFont, settings.highContrast, settings.largeText, svgRef]
  );

  useEffect(() => {
    // Store renderMindmap in ref to enable recursion without linter issues
    renderMindmapRef.current = renderMindmap;
  }, [renderMindmap]);

  return { renderMindmap, markmapRef };
}

