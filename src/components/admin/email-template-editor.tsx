"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { csrfFetch } from "@/lib/auth";
import { toast } from "@/components/ui/toast";
import { SUPPORTED_VARIABLES } from "@/lib/email/template-types";
import type { EmailTemplate } from "@/lib/email/template-types";

interface EmailTemplateEditorProps {
  mode: "create" | "edit";
  template?: EmailTemplate;
}

export function EmailTemplateEditor({
  mode,
  template,
}: EmailTemplateEditorProps) {
  const router = useRouter();
  const t = useTranslations("admin.communications.editor");

  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [htmlBody, setHtmlBody] = useState(template?.htmlBody || "");
  const [textBody, setTextBody] = useState(template?.textBody || "");
  const [category, setCategory] = useState(template?.category || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const htmlTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const textTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const subjectInputRef = useRef<HTMLInputElement | null>(null);

  // Extract variables from content
  const extractVariables = useCallback((content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    const vars = matches.map((m) => m.replace(/\{\{|\}\}/g, ""));
    return Array.from(new Set(vars));
  }, []);

  // Update preview iframe
  const [previewHtml, setPreviewHtml] = useState(htmlBody);
  useEffect(() => {
    setPreviewHtml(htmlBody);
  }, [htmlBody]);

  // Insert variable at cursor position
  const insertVariable = (
    variable: string,
    targetRef:
      | React.RefObject<HTMLTextAreaElement | null>
      | React.RefObject<HTMLInputElement | null>,
  ) => {
    const element = targetRef.current;
    if (!element) return;

    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    const text = element.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newValue = `${before}{{${variable}}}${after}`;

    if (targetRef === htmlTextareaRef) {
      setHtmlBody(newValue);
    } else if (targetRef === textTextareaRef) {
      setTextBody(newValue);
    } else if (targetRef === subjectInputRef) {
      setSubject(newValue);
    }

    // Restore cursor position after update
    setTimeout(() => {
      element.focus();
      const newPosition = start + variable.length + 4;
      element.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Handle save
  const handleSave = async () => {
    if (!name || !subject || !htmlBody || !textBody || !category) {
      toast.error("Validation Error", "All fields are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const allContent = `${subject} ${htmlBody} ${textBody}`;
      const variables = extractVariables(allContent);

      const body = {
        name,
        subject,
        htmlBody,
        textBody,
        category,
        variables,
      };

      const url =
        mode === "create"
          ? "/api/admin/email-templates"
          : `/api/admin/email-templates/${template!.id}`;

      const method = mode === "create" ? "POST" : "PUT";

      const response = await csrfFetch(url, {
        method,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${mode} template`);
      }

      toast.success(
        mode === "create" ? t("createSuccess") : t("updateSuccess"),
        `Template ${mode === "create" ? "created" : "updated"} successfully`,
      );

      router.push("/admin/communications/templates");
    } catch (error) {
      toast.error(
        mode === "create" ? t("createError") : t("updateError"),
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel: Editor */}
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            {t("name")}
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1">
            {t("category")}
          </label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={t("categoryPlaceholder")}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="subject" className="text-sm font-medium">
              {t("subject")}
            </label>
            <select
              className="text-xs border rounded px-2 py-1"
              onChange={(e) => insertVariable(e.target.value, subjectInputRef)}
              value=""
              disabled={isSubmitting}
              aria-label={t("insertVariable")}
            >
              <option value="">{t("insertVariable")}</option>
              {SUPPORTED_VARIABLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <Input
            id="subject"
            ref={subjectInputRef}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("subjectPlaceholder")}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="htmlBody" className="text-sm font-medium">
              {t("htmlBody")}
            </label>
            <select
              className="text-xs border rounded px-2 py-1"
              onChange={(e) => insertVariable(e.target.value, htmlTextareaRef)}
              value=""
              disabled={isSubmitting}
              aria-label={t("insertVariable")}
            >
              <option value="">{t("insertVariable")}</option>
              {SUPPORTED_VARIABLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <textarea
            id="htmlBody"
            ref={htmlTextareaRef}
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            placeholder={t("htmlBodyPlaceholder")}
            disabled={isSubmitting}
            className="w-full h-48 px-3 py-2 border rounded-md font-mono text-sm"
            aria-label={t("htmlBody")}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="textBody" className="text-sm font-medium">
              {t("textBody")}
            </label>
            <select
              className="text-xs border rounded px-2 py-1"
              onChange={(e) => insertVariable(e.target.value, textTextareaRef)}
              value=""
              disabled={isSubmitting}
              aria-label={t("insertVariable")}
            >
              <option value="">{t("insertVariable")}</option>
              {SUPPORTED_VARIABLES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <textarea
            id="textBody"
            ref={textTextareaRef}
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            placeholder={t("textBodyPlaceholder")}
            disabled={isSubmitting}
            className="w-full h-32 px-3 py-2 border rounded-md font-mono text-sm"
            aria-label={t("textBody")}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSubmitting ? t("saving") : t("save")}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/communications/templates")}
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div>
        <label className="block text-sm font-medium mb-2">{t("preview")}</label>
        <div className="border rounded-lg overflow-hidden bg-white">
          <iframe
            title="Email Preview"
            srcDoc={previewHtml}
            className="w-full h-96 border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
