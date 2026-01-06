'use client';

import { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoSandboxProps {
  data?: {
    title?: string;
    html: string;
    css?: string;
    js?: string;
  } | null;
}

export function DemoSandbox(props: DemoSandboxProps) {
  const { data } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  const demoData = data || { html: '<div class="p-8 text-center"><h2 class="text-2xl font-bold mb-4">Demo Interattiva</h2><p>Seleziona un maestro per creare una demo</p></div>' };
  const html = demoData.html || '';
  const css = demoData.css || '';
  const js = demoData.js || '';
  const title = demoData.title || 'Simulazione Interattiva';

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data: blob:;">
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
          {title}
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
