"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { csrfFetch } from "@/lib/auth";
import { toast } from "@/components/ui/toast";
import { EffectiveLimitsDisplay } from "./effective-limits-display";
import { LimitOverridesSection } from "./limit-overrides-section";
import { FeatureOverridesSection } from "./feature-overrides-section";
import { ModalHeader } from "./modal-header";
import { UserInfoCard } from "./user-info-card";
import { OverrideInfoBanner } from "./override-info-banner";
import { ModalActions } from "./modal-actions";
import {
  UserLimitOverrideModalProps,
  LimitOverrides,
  FeatureOverrides,
} from "./user-limit-override-types";

export function UserLimitOverrideModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: UserLimitOverrideModalProps) {
  const [limitOverrides, setLimitOverrides] = useState<LimitOverrides>({});
  const [featureOverrides, setFeatureOverrides] = useState<FeatureOverrides>(
    {},
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Initialize overrides from existing data
  useEffect(() => {
    if (isOpen && user.subscription) {
      setLimitOverrides(
        (user.subscription.overrideLimits as LimitOverrides) || {},
      );
      setFeatureOverrides(
        (user.subscription.overrideFeatures as FeatureOverrides) || {},
      );
    }
  }, [isOpen, user.subscription]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    },
    [loading, onClose],
  );

  // Add/remove Escape listener and focus first input
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 0);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user.subscription) {
      toast.error("Error", "User has no subscription");
      return;
    }

    setLoading(true);

    try {
      // Clean up overrides: remove null/undefined values
      const cleanLimits = Object.fromEntries(
        Object.entries(limitOverrides).filter(
          ([_, v]) => v !== null && v !== undefined,
        ),
      );
      const cleanFeatures = Object.fromEntries(
        Object.entries(featureOverrides).filter(([_, v]) => v !== undefined),
      );

      const response = await csrfFetch(
        `/api/admin/subscriptions/${user.subscription.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            overrideLimits:
              Object.keys(cleanLimits).length > 0 ? cleanLimits : null,
            overrideFeatures:
              Object.keys(cleanFeatures).length > 0 ? cleanFeatures : null,
            notes: notes || undefined,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update overrides");
      }

      toast.success("Overrides updated successfully");
      onSuccess?.();
      handleClose();
    } catch (err) {
      toast.error(
        "Error updating overrides",
        err instanceof Error ? err.message : "An error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLimitOverrides({});
    setFeatureOverrides({});
    setNotes("");
    onClose();
  };

  if (!isOpen || !user.subscription) return null;

  const tier = user.subscription.tier;
  const features = (tier.features as Record<string, boolean>) || {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-override-title"
        className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-xl my-8"
      >
        <ModalHeader
          title="Override User Limits"
          onClose={handleClose}
          disabled={loading}
        />
        <UserInfoCard username={user.username} email={user.email} tier={tier} />
        <OverrideInfoBanner />

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Effective Limits Comparison */}
            <EffectiveLimitsDisplay
              tier={tier}
              limitOverrides={limitOverrides}
            />

            {/* Limit Overrides */}
            <LimitOverridesSection
              tier={tier}
              limitOverrides={limitOverrides}
              onLimitChange={setLimitOverrides}
              firstInputRef={firstInputRef}
            />

            {/* Feature Overrides */}
            <FeatureOverridesSection
              features={features}
              featureOverrides={featureOverrides}
              onChange={setFeatureOverrides}
            />

            {/* Notes */}
            <div>
              <label
                htmlFor="override-notes"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Notes (optional)
              </label>
              <textarea
                id="override-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for override..."
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
              />
            </div>
          </div>

          <ModalActions
            loading={loading}
            onCancel={handleClose}
            onSubmit={() => {}}
          />
        </form>
      </div>
    </div>
  );
}

export default UserLimitOverrideModal;
