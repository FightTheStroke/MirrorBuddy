"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { toast } from "@/components/ui/toast";
import type { EmailTemplate } from "@/lib/email/template-service";
import type { ResendLimits } from "@/lib/observability/resend-limits";
import type {
  RecipientFilters,
  RecipientPreview,
} from "@/lib/email/campaign-service";
import { TemplateSelector } from "./campaign-composer/template-selector";
import { FilterConfigurator } from "./campaign-composer/filter-configurator";
import { RecipientPreviewStep } from "./campaign-composer/recipient-preview";
import { SendConfirmation } from "./campaign-composer/send-confirmation";

interface CampaignComposerProps {
  templates: EmailTemplate[];
  limits: ResendLimits;
}

/**
 * CampaignComposer - Multi-step email campaign creation wizard
 *
 * Step 1: Select template
 * Step 2: Configure recipient filters
 * Step 3: Preview recipients (fetch from preview API, show count + sample)
 * Step 4: Confirm send with quota check (uses getResendLimits data)
 *
 * NOTE: Quota limits are passed as prop from server component.
 * The getResendLimits function is called server-side before rendering.
 */
export function CampaignComposer({ templates, limits }: CampaignComposerProps) {
  const router = useRouter();
  const t = useTranslations("admin.communications.campaigns");

  const [step, setStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [filters, setFilters] = useState<RecipientFilters>({
    tiers: [],
    roles: [],
    languages: [],
    schoolLevels: [],
    disabled: false,
    isTestData: false,
  });
  const [preview, setPreview] = useState<RecipientPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const availableDaily = limits.emailsToday.limit - limits.emailsToday.used;
  const availableMonthly = limits.emailsMonth.limit - limits.emailsMonth.used;
  const isOverQuota = preview
    ? preview.totalCount > availableDaily ||
      preview.totalCount > availableMonthly
    : false;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setStep(2);
  };

  const handleFilterChange = (key: keyof RecipientFilters, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleTierToggle = (tier: string) => {
    setFilters((prev) => {
      const tiers = prev.tiers || [];
      const newTiers = tiers.includes(tier)
        ? tiers.filter((t) => t !== tier)
        : [...tiers, tier];
      return { ...prev, tiers: newTiers };
    });
  };

  /**
   * Fetch recipient preview from API
   * Calls POST /api/admin/email-campaigns/preview/preview with filters
   * Returns totalCount and sampleUsers (first 10)
   */
  const handleFetchPreview = async () => {
    setIsLoading(true);
    try {
      const response = await csrfFetch(
        "/api/admin/email-campaigns/preview/preview",
        {
          method: "POST",
          body: JSON.stringify({ filters }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch preview");
      }

      // Store preview data for quota validation in step 4
      setPreview(data.preview);
      setStep(3);
    } catch (error) {
      toast.error(
        t("previewError"),
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Send campaign to recipients
   * Server-side will call getResendLimits() again for quota validation
   */
  const handleSendCampaign = async () => {
    if (!selectedTemplateId || !preview) return;

    setIsSending(true);
    try {
      const response = await csrfFetch("/api/admin/email-campaigns", {
        method: "POST",
        body: JSON.stringify({
          templateId: selectedTemplateId,
          filters,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send campaign");
      }

      toast.success(
        t("sendSuccess"),
        `Campaign sent to ${preview.totalCount} recipients`,
      );
      router.push("/admin/communications/campaigns");
    } catch (error) {
      toast.error(
        t("sendError"),
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= num
                  ? "bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              {num}
            </div>
            {num < 4 && <div className="w-12 h-1 bg-gray-300 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <TemplateSelector
          templates={templates}
          onSelect={handleTemplateSelect}
        />
      )}

      {/* Step 2: Filter Configuration */}
      {step === 2 && (
        <FilterConfigurator
          filters={filters}
          onFilterChange={handleFilterChange}
          onTierToggle={handleTierToggle}
          onBack={() => setStep(1)}
          onNext={handleFetchPreview}
          isLoading={isLoading}
        />
      )}

      {/* Step 3: Preview Recipients */}
      {step === 3 && preview && (
        <RecipientPreviewStep
          preview={preview}
          limits={limits}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}

      {/* Step 4: Confirm Send with Quota Check */}
      {step === 4 && preview && (
        <SendConfirmation
          preview={preview}
          selectedTemplate={selectedTemplate}
          limits={limits}
          isSending={isSending}
          isOverQuota={isOverQuota}
          onBack={() => setStep(3)}
          onSend={handleSendCampaign}
        />
      )}
    </div>
  );
}
