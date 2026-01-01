'use client';

import { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoSandboxProps {
  data: {
    title?: string;
    html: string;
    css?: string;
    js?: string;
  };
}

// Note: Validation is already done by demo-handler.ts before reaching this component.
// The demo-handler sanitizes HTML and validates JS before returning data.
// This component trusts the data has been pre-validated.

export function DemoSandbox({ data }: DemoSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  const { html, css = '', js = '' } = data;

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
      ${js ? `<script>${js}</script>` : ''}
    </body>
    </html>
  `;

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

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

      <div className="flex-1 mx-4 mb-4 border rounded-lg overflow-hidden bg-white dark:bg-slate-800 min-h-[300px]">
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
