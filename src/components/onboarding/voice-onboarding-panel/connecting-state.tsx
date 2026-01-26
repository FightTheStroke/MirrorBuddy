"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConnectingStateProps {
  configError: string | null;
  onCancel: () => void;
  className?: string;
}

export function ConnectingState({
  configError,
  onCancel,
  className,
}: ConnectingStateProps) {
  const t = useTranslations("onboarding.voicePanel");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-8 rounded-2xl",
        "bg-gradient-to-br from-pink-500 to-pink-600",
        className,
      )}
    >
      <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/30 animate-pulse">
        <Image
          src="/avatars/melissa.jpg"
          alt="Melissa"
          width={80}
          height={80}
          className="object-cover w-full h-full"
        />
      </div>
      <p className="text-white font-medium">
        {configError || "Connessione in corso..."}
      </p>
      {configError && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-white/80 hover:text-white"
        >
          {t("cancel")}
        </Button>
      )}
    </motion.div>
  );
}
