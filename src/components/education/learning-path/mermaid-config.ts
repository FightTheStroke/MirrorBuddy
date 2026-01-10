import mermaid from 'mermaid';

/**
 * Initialize Mermaid with learning path theme
 */
export function initializeMermaidConfig(): void {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#3b82f6',
      primaryTextColor: '#f1f5f9',
      primaryBorderColor: '#64748b',
      lineColor: '#64748b',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a',
      background: '#1e293b',
      mainBkg: '#1e293b',
    },
    flowchart: {
      curve: 'basis',
      padding: 15,
      nodeSpacing: 30,
      rankSpacing: 40,
    },
  });
}
