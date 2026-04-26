'use client';

import { useTranslations } from 'next-intl';
import { UPLOAD_TOOLS, CREATE_TOOLS, SEARCH_TOOLS } from '@/lib/tools/constants';

interface ToolsSectionProps {
  formData: {
    availableTools: string[];
  };
  onChange: (data: { availableTools: string[] }) => void;
}

// Combine all tools into a single list with categories
const ALL_TOOLS = [
  { category: 'Upload', tools: Object.values(UPLOAD_TOOLS) },
  { category: 'Create', tools: Object.values(CREATE_TOOLS) },
  { category: 'Search', tools: Object.values(SEARCH_TOOLS) },
];

export function ToolsSection({ formData, onChange }: ToolsSectionProps) {
  const t = useTranslations('admin');

  const handleToolToggle = (toolType: string, enabled: boolean) => {
    const updatedTools = enabled
      ? [...formData.availableTools, toolType]
      : formData.availableTools.filter((t) => t !== toolType);
    onChange({ availableTools: updatedTools });
  };

  const isToolEnabled = (toolType: string): boolean => {
    return formData.availableTools.includes(toolType);
  };

  const selectAll = () => {
    const allToolTypes = ALL_TOOLS.flatMap((cat) => cat.tools.map((t) => t.type));
    onChange({ availableTools: allToolTypes });
  };

  const selectNone = () => {
    onChange({ availableTools: [] });
  };

  const totalTools = ALL_TOOLS.reduce((acc, cat) => acc + cat.tools.length, 0);
  const selectedCount = formData.availableTools.length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('tiers.toolsAvailable')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('tiers.selectedCount', { selected: selectedCount, total: totalTools })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-primary hover:underline"
          >
            {t('tiers.selectAll')}
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={selectNone}
            className="text-xs text-primary hover:underline"
          >
            {t('tiers.deselectAll')}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {ALL_TOOLS.map((category) => (
          <div key={category.category}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{category.category}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {category.tools.map((tool) => (
                <label
                  key={tool.type}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    isToolEnabled(tool.type)
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isToolEnabled(tool.type)}
                    onChange={(e) => handleToolToggle(tool.type, e.target.checked)}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm">{tool.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
