"use client";

import type { EmailTemplate } from "@/lib/email/template-service";
import { useTranslations } from "next-intl";

interface TemplateSelectorProps {
  templates: EmailTemplate[];
  onSelect: (templateId: string) => void;
}

export function TemplateSelector({
  templates,
  onSelect,
}: TemplateSelectorProps) {
  const t = useTranslations("admin.communications.campaigns");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t("selectTemplate")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className="p-4 border rounded-lg hover:border-blue-500 text-left transition-colors"
          >
            <h3 className="font-semibold mb-1">{template.name}</h3>
            <p className="text-sm text-gray-600">{template.subject}</p>
            <span className="text-xs text-gray-500 mt-2 inline-block">
              {template.category}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
