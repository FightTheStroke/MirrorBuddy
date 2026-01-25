import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export function LoadingState() {
  const t = useTranslations("common");

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-950 dark:to-blue-950 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <p className="text-gray-600 dark:text-gray-400">{t("loading")}</p>
      </motion.div>
    </div>
  );
}
