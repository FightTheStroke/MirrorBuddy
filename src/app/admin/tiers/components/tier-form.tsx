"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Save, X } from "lucide-react";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { BasicInfoSection } from "./basic-info-section";
import { LimitsSection } from "./limits-section";
import { FeaturesSection } from "./features-section";
import { ToolsSection } from "./tools-section";
import { MaestriSection } from "./maestri-section";
import { CoachesSection } from "./coaches-section";
import { BuddiesSection } from "./buddies-section";
import { ModelsSection } from "./models-section";

interface TierFormData {
  id?: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPriceEur: number | null;
  sortOrder: number;
  isActive: boolean;
  chatLimitDaily: number;
  voiceMinutesDaily: number;
  toolsLimitDaily: number;
  docsLimitTotal: number;
  chatModel: string;
  realtimeModel: string;
  pdfModel: string;
  mindmapModel: string;
  quizModel: string;
  flashcardsModel: string;
  summaryModel: string;
  formulaModel: string;
  chartModel: string;
  homeworkModel: string;
  webcamModel: string;
  demoModel: string;
  features: Record<string, unknown>;
  availableMaestri: string[];
  availableCoaches: string[];
  availableBuddies: string[];
  availableTools: string[];
  stripePriceId: string | null;
}

interface TierFormProps {
  tier?: TierFormData;
}

export function TierForm({ tier }: TierFormProps) {
  const router = useRouter();
  const isEditing = !!tier?.id;

  const [formData, setFormData] = useState<TierFormData>({
    code: tier?.code || "",
    name: tier?.name || "",
    description: tier?.description || null,
    monthlyPriceEur: tier?.monthlyPriceEur || null,
    sortOrder: tier?.sortOrder || 0,
    isActive: tier?.isActive ?? true,
    chatLimitDaily: tier?.chatLimitDaily || 10,
    voiceMinutesDaily: tier?.voiceMinutesDaily || 5,
    toolsLimitDaily: tier?.toolsLimitDaily || 10,
    docsLimitTotal: tier?.docsLimitTotal || 1,
    chatModel: tier?.chatModel || "gpt-4o-mini",
    realtimeModel: tier?.realtimeModel || "gpt-realtime-mini",
    pdfModel: tier?.pdfModel || "gpt-4o-mini",
    mindmapModel: tier?.mindmapModel || "gpt-4o-mini",
    quizModel: tier?.quizModel || "gpt-4o-mini",
    flashcardsModel: tier?.flashcardsModel || "gpt-4o-mini",
    summaryModel: tier?.summaryModel || "gpt-4o-mini",
    formulaModel: tier?.formulaModel || "gpt-4o-mini",
    chartModel: tier?.chartModel || "gpt-4o-mini",
    homeworkModel: tier?.homeworkModel || "gpt-4o-mini",
    webcamModel: tier?.webcamModel || "gpt-4o-mini",
    demoModel: tier?.demoModel || "gpt-4o-mini",
    features: tier?.features || {},
    availableMaestri: tier?.availableMaestri || [],
    availableCoaches: tier?.availableCoaches || [],
    availableBuddies: tier?.availableBuddies || [],
    availableTools: tier?.availableTools || [],
    stripePriceId: tier?.stripePriceId || null,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.name) {
      toast.error("Errore", "Codice e nome sono obbligatori");
      return;
    }

    setIsSaving(true);

    try {
      const url = isEditing
        ? `/api/admin/tiers/${tier.id}`
        : "/api/admin/tiers";
      const method = isEditing ? "PUT" : "POST";

      const response = await csrfFetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Errore durante il salvataggio");
      }

      toast.success(
        "Successo",
        isEditing
          ? "Piano aggiornato con successo"
          : "Piano creato con successo",
      );

      router.push("/admin/tiers");
      router.refresh();
    } catch (error) {
      console.error("Error saving tier:", error);
      toast.error(
        "Errore",
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/tiers");
  };

  const updateFormData = (data: Partial<TierFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <BasicInfoSection
        formData={{
          code: formData.code,
          name: formData.name,
          description: formData.description,
          monthlyPriceEur: formData.monthlyPriceEur,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
        }}
        isEditing={isEditing}
        onChange={updateFormData}
      />

      <LimitsSection
        formData={{
          chatLimitDaily: formData.chatLimitDaily,
          voiceMinutesDaily: formData.voiceMinutesDaily,
          toolsLimitDaily: formData.toolsLimitDaily,
          docsLimitTotal: formData.docsLimitTotal,
        }}
        onChange={updateFormData}
      />

      <ModelsSection
        formData={{
          chatModel: formData.chatModel,
          realtimeModel: formData.realtimeModel,
          pdfModel: formData.pdfModel,
          mindmapModel: formData.mindmapModel,
          quizModel: formData.quizModel,
          flashcardsModel: formData.flashcardsModel,
          summaryModel: formData.summaryModel,
          formulaModel: formData.formulaModel,
          chartModel: formData.chartModel,
          homeworkModel: formData.homeworkModel,
          webcamModel: formData.webcamModel,
          demoModel: formData.demoModel,
        }}
        onChange={updateFormData}
      />

      <FeaturesSection
        formData={{
          features: formData.features,
        }}
        onChange={updateFormData}
      />

      <ToolsSection
        formData={{
          availableTools: formData.availableTools,
        }}
        onChange={updateFormData}
      />

      <MaestriSection
        formData={{
          availableMaestri: formData.availableMaestri,
        }}
        onChange={updateFormData}
      />

      <CoachesSection
        formData={{
          availableCoaches: formData.availableCoaches,
        }}
        onChange={updateFormData}
      />

      <BuddiesSection
        formData={{
          availableBuddies: formData.availableBuddies,
        }}
        onChange={updateFormData}
      />

      {/* Form Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X className="w-4 h-4 mr-2" />
          Annulla
        </Button>
        <Button type="submit" disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving
            ? "Salvataggio..."
            : isEditing
              ? "Salva Modifiche"
              : "Crea Piano"}
        </Button>
      </div>
    </form>
  );
}
