'use client';

import { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildDemoHTML, getDemoSandboxPermissions, getDemoAllowPermissions } from '@/lib/tools/demo-html-builder';

interface DemoSandboxProps {
  data?: {
    title?: string;
    html: string;
    css?: string;
    js?: string;
    code?: string;
  } | null;
}

export function DemoSandbox(props: DemoSandboxProps) {
  const { data } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);

  const demoData = data || { 
    html: '<div class="p-8 text-center"><h2 class="text-2xl font-bold mb-4">Demo Interattiva</h2><p>Seleziona un maestro per creare una demo</p></div>' 
  };
  const title = demoData.title || 'Simulazione Interattiva';

  // Use shared HTML builder for consistency
  const fullHtml = buildDemoHTML({
    html: demoData.html || '',
    css: demoData.css || '',
    js: demoData.js || '',
    code: demoData.code,
  });

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
          sandbox={getDemoSandboxPermissions()}
          className="w-full h-full border-0"
          title="Demo interattiva"
          allow={getDemoAllowPermissions()}
          style={{ minHeight: '400px', width: '100%', height: '100%' }}
          onLoad={() => {
            // Force script execution after iframe loads
            try {
              const iframe = iframeRef.current;
              if (iframe && iframe.contentWindow) {
                // Scripts should already execute via srcDoc, but this ensures they run
                // Using type assertion since eval may not be in TypeScript types
                const win = iframe.contentWindow as unknown as { eval?: (code: string) => void };
                if (win.eval) {
                  win.eval('void(0)');
                }
              }
            } catch (e) {
              // Cross-origin restrictions may prevent this, but scripts should still work
            }
          }}
        />
      </div>
    </div>
  );
}
