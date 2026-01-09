'use client';

import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  Save,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { autoSaveMaterial } from '@/lib/hooks/use-saved-materials';
import { buildDemoHTML, getDemoSandboxPermissions, getDemoAllowPermissions } from '@/lib/tools/demo-html-builder';
import { cn } from '@/lib/utils';

interface HTMLPreviewProps {
  code: string;
  title?: string;
  description?: string;
  subject?: string;
  maestroId?: string;
  onClose?: () => void;
  allowSave?: boolean;
}

export function HTMLPreview({
  code,
  title = 'Interactive Demo',
  description,
  subject,
  maestroId: _maestroId, // Reserved for future use with autoSaveMaterial
  onClose,
  allowSave = true,
}: HTMLPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Use shared HTML builder for consistency across all demo renderers
  const iframeSrcDoc = useMemo(() => {
    return buildDemoHTML({ code, html: '', css: '', js: '' });
  }, [code]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await autoSaveMaterial(
        'demo',
        title,
        { code, description, tags: subject ? [subject] : [] },
        { subject }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col',
        isFullscreen
          ? 'fixed inset-4 z-50'
          : 'w-full max-w-4xl max-h-[80vh]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {allowSave && (
            <Button variant="ghost" size="icon-sm" onClick={handleSave} aria-label={saved ? 'Salvato' : 'Salva demo'}>
              {saved ? <Check className="w-4 h-4 text-green-500" /> : <Save className="w-4 h-4" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            aria-label={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {onClose && (
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Chiudi demo">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content - Only show iframe execution, no code view */}
      <div className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          title={title}
          className="w-full h-full min-h-[400px] bg-white"
          sandbox={getDemoSandboxPermissions()}
          srcDoc={iframeSrcDoc}
          allow={getDemoAllowPermissions()}
          style={{ width: '100%', height: '100%', minHeight: '400px' }}
          onLoad={() => {
            // Scripts execute automatically via srcDoc - just log for debugging
            console.debug('[HtmlPreview] iframe loaded');
          }}
        />
      </div>
    </motion.div>
  );
}
