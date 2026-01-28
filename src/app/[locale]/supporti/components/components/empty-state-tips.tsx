/**
 * @file empty-state-tips.tsx
 * @brief Empty state tips component
 */

import { motion } from "framer-motion";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Backpack } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateTipsProps {
  show: boolean;
}

export function EmptyStateTips({ show }: EmptyStateTipsProps) {
  const router = useRouter();
  const t = useTranslations("supporti");

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800"
    >
      <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-3 flex items-center gap-2">
        <Backpack className="w-5 h-5" aria-hidden="true" />
        {t("emptyState.backpackEmpty")}
      </h3>
      <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-4">
        {t("emptyState.startCreating")}
      </p>
      <Button
        onClick={() => router.push("/astuccio")}
        className="bg-emerald-700 hover:bg-emerald-800 text-white"
      >
        {t("emptyState.goToToolcase")}
      </Button>
    </motion.div>
  );
}
