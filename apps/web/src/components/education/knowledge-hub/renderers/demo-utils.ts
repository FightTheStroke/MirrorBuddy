/**
 * Demo renderer utility functions
 * Accessibility CSS generation and HTML building
 */

import { buildDemoHTML } from '@/lib/tools/demo-html-builder';

interface AccessibilitySettings {
  dyslexiaFont: boolean;
  extraLetterSpacing: boolean;
  increasedLineHeight: boolean;
  highContrast: boolean;
  largeText: boolean;
  fontSize: number;
  lineSpacing: number;
  customBackgroundColor: string;
  customTextColor: string;
}

interface DemoData {
  title?: string;
  description?: string;
  type?: 'simulation' | 'animation' | 'interactive';
  content?: unknown;
  previewImage?: string;
  code?: string;
  html?: string;
  css?: string;
  js?: string;
}

/**
 * Generate accessibility CSS based on user settings
 */
export function generateAccessibilityCSS(settings: AccessibilitySettings): string {
  const rules: string[] = [];

  rules.push(`
    * {
      font-size: ${settings.fontSize * 100}% !important;
      line-height: ${settings.lineSpacing * 1.4}em !important;
    }
  `);

  if (settings.dyslexiaFont) {
    rules.push(`
      @import url('https://fonts.cdnfonts.com/css/opendyslexic');
      * {
        font-family: 'OpenDyslexic', sans-serif !important;
      }
    `);
  }

  if (settings.extraLetterSpacing) {
    rules.push(`
      * {
        letter-spacing: 0.05em !important;
        word-spacing: 0.1em !important;
      }
    `);
  }

  if (settings.increasedLineHeight) {
    rules.push(`
      * {
        line-height: ${Math.max(settings.lineSpacing, 1.8)}em !important;
      }
    `);
  }

  if (settings.highContrast) {
    rules.push(`
      body, html {
        background-color: #000 !important;
        color: #fff !important;
      }
      * {
        border-color: #fff !important;
      }
      a, a:visited {
        color: #ffff00 !important;
      }
      button, input, select, textarea {
        background-color: #333 !important;
        color: #fff !important;
        border: 2px solid #fff !important;
      }
    `);
  }

  if (settings.largeText) {
    rules.push(`
      * {
        font-size: ${settings.fontSize * 120}% !important;
      }
    `);
  }

  return rules.join('\n');
}

/**
 * Build HTML code from separate html/css/js parts or use existing code
 */
export function buildDemoCode(demoData: DemoData, accessibilityCSS: string = ''): string | null {
  if (demoData.code) {
    const baseHtml = buildDemoHTML({ html: '', css: '', js: '', code: demoData.code });

    if (accessibilityCSS && baseHtml.includes('</head>')) {
      return baseHtml.replace('</head>', `<style id="accessibility-styles">${accessibilityCSS}</style></head>`);
    }

    return baseHtml;
  }

  if (demoData.html || demoData.css || demoData.js) {
    const baseHtml = buildDemoHTML({
      html: demoData.html || '',
      css: demoData.css || '',
      js: demoData.js || '',
    });

    if (accessibilityCSS && baseHtml.includes('</head>')) {
      return baseHtml.replace('</head>', `<style id="accessibility-styles">${accessibilityCSS}</style></head>`);
    }

    return baseHtml;
  }

  return null;
}
