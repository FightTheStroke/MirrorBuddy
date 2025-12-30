'use client';

import { useState, useRef } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoSandboxProps {
  data: {
    title?: string;
    html: string;
    css?: string;
    js?: string;
  };
}

// Dangerous patterns to block
const DANGEROUS_PATTERNS = [
  /document\.cookie/i,
  /localStorage/i,
  /sessionStorage/i,
  /fetch\s*\(/i,
  /XMLHttpRequest/i,
  /window\.open/i,
  /window\.location/i,
  /eval\s*\(/i,
  /Function\s*\(/i,
];

function validateCode(code: string): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      warnings.push(`Blocked: ${pattern.source}`);
    }
  }

  return { safe: warnings.length === 0, warnings };
}

export function DemoSandbox({ data }: DemoSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  const { html, css = '', js = '' } = data;

  // Validate JS code
  const validation = validateCode(js);

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline'; script-src 'unsafe-inline';">
      <style>
        body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
        ${css}
      </style>
    </head>
    <body>
      ${html}
      ${validation.safe ? `<script>${js}</script>` : '<!-- JS blocked for safety -->'}
    </body>
    </html>
  `;

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  if (!validation.safe) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">Demo bloccata per sicurezza</span>
        </div>
        <ul className="text-sm text-yellow-600 dark:text-yellow-500 list-disc list-inside">
          {validation.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2 px-4 pt-4">
        <h3 className="font-medium text-slate-900 dark:text-white">
          {data.title || 'Simulazione Interattiva'}
        </h3>
        <Button variant="ghost" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Ricarica
        </Button>
      </div>

      <div className="flex-1 mx-4 mb-4 border rounded-lg overflow-hidden bg-white dark:bg-slate-800">
        <iframe
          key={key}
          ref={iframeRef}
          srcDoc={fullHtml}
          sandbox="allow-scripts"
          className="w-full h-full border-0"
          title="Demo interattiva"
        />
      </div>
    </div>
  );
}
