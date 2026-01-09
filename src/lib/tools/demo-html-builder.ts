/**
 * Shared utility to build complete HTML for demo tools
 * Ensures consistency across all demo renderers (chat, zaino, knowledge hub, etc.)
 */

export interface DemoData {
  title?: string;
  description?: string;
  html: string;
  css?: string;
  js?: string;
  code?: string; // Full HTML code (alternative to html/css/js)
}

/**
 * Build complete, self-contained HTML document for demo
 * Includes proper viewport, responsive design, and script execution handling
 */
export function buildDemoHTML(demoData: DemoData): string {
  // If we have full code already, use it (but ensure it has proper structure)
  if (demoData.code) {
    // Check if it already has DOCTYPE and html structure
    if (demoData.code.includes('<!DOCTYPE html>') || demoData.code.includes('<html>')) {
      // Ensure viewport meta tag is present
      let finalCode = demoData.code;
      if (!finalCode.includes('viewport')) {
        finalCode = finalCode.replace(
          /<head>/i,
          `<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">`
        );
      }
      
      // Ensure proper responsive CSS is injected if missing
      if (!finalCode.includes('box-sizing: border-box')) {
        const responsiveCSS = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html, body {
      width: 100%;
      height: 100%;
      overflow-x: auto;
      overflow-y: auto;
    }
    
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #1e293b;
      background-color: #ffffff;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    @media (max-width: 768px) {
      body {
        padding: 12px;
        font-size: 14px;
      }
    }
    
    @media (min-width: 1920px) {
      body {
        padding: 24px;
        font-size: 18px;
      }
    }
    
    canvas, svg {
      max-width: 100%;
      height: auto;
    }
    
    * {
      max-width: 100%;
    }`;
        
        // Inject CSS into head or before closing head tag
        if (finalCode.includes('</head>')) {
          finalCode = finalCode.replace('</head>', `<style>${responsiveCSS}</style></head>`);
        } else if (finalCode.includes('<head>')) {
          finalCode = finalCode.replace('<head>', `<head><style>${responsiveCSS}</style>`);
        }
      }
      
      return finalCode;
    }
    // Wrap code without structure
    return buildHTMLFromParts(demoData.code, '', '');
  }

  // Build from html/css/js parts
  return buildHTMLFromParts(demoData.html || '', demoData.css || '', demoData.js || '');
}

/**
 * Build HTML document from separate parts
 */
function buildHTMLFromParts(html: string, css: string, js: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html, body {
      width: 100%;
      height: 100%;
      overflow-x: auto;
      overflow-y: auto;
    }
    
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #1e293b;
      background-color: #ffffff;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
      body {
        padding: 12px;
        font-size: 14px;
      }
    }
    
    @media (min-width: 1920px) {
      body {
        padding: 24px;
        font-size: 18px;
      }
    }
    
    /* Ensure canvas and SVG scale properly */
    canvas, svg {
      max-width: 100%;
      height: auto;
    }
    
    /* Prevent horizontal scroll on small screens */
    * {
      max-width: 100%;
    }
    
    ${css}
  </style>
</head>
<body>
  ${html}
  ${js ? `<script>
    (function() {
      'use strict';

      function executeDemoScript() {
        try {
          ${js}
        } catch (error) {
          console.error('Demo script error:', error);
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = 'position:fixed;top:10px;right:10px;background:#ef4444;color:white;padding:8px 12px;border-radius:4px;font-size:12px;z-index:9999;';
          errorDiv.textContent = 'Errore nello script: ' + error.message;
          document.body.appendChild(errorDiv);
          setTimeout(() => errorDiv.remove(), 5000);
        }
      }

      // Execute once when DOM is ready (no double execution)
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', executeDemoScript);
      } else {
        executeDemoScript();
      }
    })();
  </script>` : ''}
</body>
</html>`;
}

/**
 * Get sandbox permissions string for iframe
 * Same permissions everywhere for consistency
 */
export function getDemoSandboxPermissions(): string {
  // Removed allow-top-navigation* to prevent button clicks from navigating instead of executing JS
  // Removed allow-popups-to-escape-sandbox as unnecessary and security risk
  return 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock allow-downloads';
}

/**
 * Get allow attribute string for iframe
 */
export function getDemoAllowPermissions(): string {
  return 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; microphone; camera; geolocation';
}
