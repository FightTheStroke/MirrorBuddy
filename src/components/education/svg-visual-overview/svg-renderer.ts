import DOMPurify from 'dompurify';
import { logger } from '@/lib/logger';
import {
  generateOverviewSVG,
  generateMermaidCode,
  type OverviewData,
  type SVGGenerationOptions,
} from '@/lib/tools/svg-overview-generator';

// Mermaid type for lazy loading
type MermaidAPI = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

// Mermaid configuration for fallback rendering
const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: 'dark' as const,
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#f1f5f9',
    primaryBorderColor: '#64748b',
    lineColor: '#64748b',
    background: '#1e293b',
  },
  flowchart: {
    curve: 'basis' as const,
    padding: 15,
  },
};

// Lazy-loaded mermaid instance
let mermaidInstance: MermaidAPI | null = null;
let mermaidLoadPromise: Promise<MermaidAPI> | null = null;

async function getMermaid(): Promise<MermaidAPI> {
  if (mermaidInstance) return mermaidInstance;
  if (!mermaidLoadPromise) {
    mermaidLoadPromise = import('mermaid').then((module) => {
      module.default.initialize(MERMAID_CONFIG);
      mermaidInstance = module.default;
      return module.default;
    });
  }
  return mermaidLoadPromise;
}

export async function renderSVGDiagram(
  container: HTMLDivElement,
  overviewData: OverviewData,
  options: {
    theme: 'light' | 'dark';
    layout: 'radial' | 'tree';
    useMermaid: boolean;
    width?: number;
    height?: number;
  }
): Promise<{ svg: string; error: string | null }> {
  try {
    const width = options.width || container.clientWidth || 800;
    const height = options.height || 600;

    if (options.useMermaid) {
      // Fallback to Mermaid rendering (lazy loaded)
      const mermaid = await getMermaid();
      const code = generateMermaidCode(overviewData);
      const id = `svg-overview-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const { svg } = await mermaid.render(id, code);
      const sanitizedSvg = DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['use'],
      });
      container.innerHTML = sanitizedSvg;
      return { svg: sanitizedSvg, error: null };
    }

    // Generate custom SVG
    const svgOptions: SVGGenerationOptions = {
      theme: options.theme,
      layout: options.layout,
      width,
      height,
      showIcons: true,
    };
    const svg = generateOverviewSVG(overviewData, svgOptions);
    const sanitizedSvg = DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
    container.innerHTML = sanitizedSvg;

    logger.debug('[SVGRenderer] Diagram rendered', {
      useMermaid: options.useMermaid,
      theme: options.theme,
      layout: options.layout,
    });

    return { svg: sanitizedSvg, error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[SVGRenderer] Render error', { errorMessage: errorMsg });
    return { svg: '', error: errorMsg };
  }
}

export function downloadSVG(svg: string, filename: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function convertSVGToPNG(
  svg: string,
  filename: string,
  theme: 'light' | 'dark'
): Promise<void> {
  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  img.onload = () => {
    canvas.width = img.width || 800;
    canvas.height = img.height || 600;
    if (ctx) {
      ctx.fillStyle = theme === 'dark' ? '#1e293b' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    }
  };

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  img.src = URL.createObjectURL(svgBlob);
}
