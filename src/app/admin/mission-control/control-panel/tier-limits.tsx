"use client";

/**
 * Tier Limits Component
 * Allows editing limits for Trial/Base/Pro tiers
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TierLimitConfig } from "@/lib/admin/control-panel-types";
import { csrfFetch } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { useTranslations } from "next-intl";

interface TierLimitsProps {
  tiers: TierLimitConfig[];
  onUpdate: (tierId: string) => void;
}

export function TierLimits({ tiers, onUpdate }: TierLimitsProps) {
  const t = useTranslations("admin");
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, number>>({});

  const startEdit = (tier: TierLimitConfig) => {
    setEditingTier(tier.tierId);
    setFormData({
      chatLimitDaily: tier.chatLimitDaily,
      voiceMinutesDaily: tier.voiceMinutesDaily,
      toolsLimitDaily: tier.toolsLimitDaily,
      docsLimitTotal: tier.docsLimitTotal,
    });
  };

  const handleSave = async (tierId: string) => {
    setLoading(true);
    try {
      const response = await csrfFetch("/api/admin/control-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tier-limit",
          data: {
            tierId,
            update: {
              chatLimitDaily: formData.chatLimitDaily,
              voiceMinutesDaily: formData.voiceMinutesDaily,
              toolsLimitDaily: formData.toolsLimitDaily,
              docsLimitTotal: formData.docsLimitTotal,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tier limits");
      }

      onUpdate(tierId);
      setEditingTier(null);
    } catch (error) {
      logger.error("Error updating tier limits", undefined, error);
      alert("Failed to update tier limits");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: number) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tierLimits")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tiers.map((tier) => (
          <div key={tier.tierId} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{tier.name}</h3>
                <p className="text-sm text-gray-600">{tier.code}</p>
              </div>
              {editingTier !== tier.tierId && (
                <Button size="sm" onClick={() => startEdit(tier)}>
                  {t("edit")}
                </Button>
              )}
            </div>

            {editingTier === tier.tierId ? (
              <div className="bg-gray-50 p-3 rounded space-y-3">
                <div>
                  <label
                    htmlFor={`tier-${tier.tierId}-chat-limit`}
                    className="text-sm font-medium"
                  >
                    {t("dailyChatLimit")}
                  </label>
                  <input
                    type="number"
                    id={`tier-${tier.tierId}-chat-limit`}
                    min="0"
                    value={formData.chatLimitDaily}
                    onChange={(e) =>
                      handleInputChange(
                        "chatLimitDaily",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full mt-1 border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`tier-${tier.tierId}-voice-minutes`}
                    className="text-sm font-medium"
                  >
                    {t("dailyVoiceMinutes")}
                  </label>
                  <input
                    type="number"
                    id={`tier-${tier.tierId}-voice-minutes`}
                    min="0"
                    value={formData.voiceMinutesDaily}
                    onChange={(e) =>
                      handleInputChange(
                        "voiceMinutesDaily",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full mt-1 border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`tier-${tier.tierId}-tools-limit`}
                    className="text-sm font-medium"
                  >
                    {t("dailyToolsLimit")}
                  </label>
                  <input
                    type="number"
                    id={`tier-${tier.tierId}-tools-limit`}
                    min="0"
                    value={formData.toolsLimitDaily}
                    onChange={(e) =>
                      handleInputChange(
                        "toolsLimitDaily",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full mt-1 border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`tier-${tier.tierId}-docs-limit`}
                    className="text-sm font-medium"
                  >
                    {t("totalDocuments")}
                  </label>
                  <input
                    type="number"
                    id={`tier-${tier.tierId}-docs-limit`}
                    min="0"
                    value={formData.docsLimitTotal}
                    onChange={(e) =>
                      handleInputChange(
                        "docsLimitTotal",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full mt-1 border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSave(tier.tierId)}
                    disabled={loading}
                  >
                    {t("saveChanges")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingTier(null)}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">{t("chatDay")}</span>
                  <span className="font-medium ml-1">
                    {tier.chatLimitDaily}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">{t("voiceMinsDay")}</span>
                  <span className="font-medium ml-1">
                    {tier.voiceMinutesDaily}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">{t("toolsDay")}</span>
                  <span className="font-medium ml-1">
                    {tier.toolsLimitDaily}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">{t("docsTotal")}</span>
                  <span className="font-medium ml-1">
                    {tier.docsLimitTotal}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
