"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PermissionErrorViewProps {
  error: string;
  onRetry: () => Promise<void>;
  onSwitchToChat?: () => void;
  onClose: () => void;
}

export function PermissionErrorView({
  error,
  onRetry,
  onSwitchToChat,
  onClose,
}: PermissionErrorViewProps) {
  const t = useTranslations("voice.permission");
  const tCommon = useTranslations("common");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-4"
      >
        <Card className="bg-gradient-to-b from-amber-900 to-slate-950 border-amber-700 text-white">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t("title")}</h2>
                <p className="text-sm text-amber-300">{t("subtitle")}</p>
              </div>
            </div>

            <div className="bg-amber-950/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-200">{error}</p>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-slate-300">{t("enableLabel")}</p>
              <ol className="text-sm text-slate-400 list-decimal list-inside space-y-1">
                <li>{t("steps.lockIcon")}</li>
                <li>{t("steps.findMicrophone")}</li>
                <li>{t("steps.selectAllow")}</li>
                <li>{t("steps.reload")}</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={onRetry}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {tCommon("retry")}
              </Button>
              {onSwitchToChat && (
                <Button
                  onClick={onSwitchToChat}
                  variant="outline"
                  className="flex-1 border-amber-600 text-amber-400 hover:bg-amber-950"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t("switchToChat")}
                </Button>
              )}
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-slate-600"
              >
                {tCommon("close")}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
