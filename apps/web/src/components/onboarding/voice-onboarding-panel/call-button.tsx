"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface CallButtonProps {
  onClick: () => void;
  className?: string;
}

export function CallButton({ onClick, className }: CallButtonProps) {
  const t = useTranslations("common");
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-6 py-4 rounded-2xl",
        "bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700",
        "text-white font-medium shadow-lg hover:shadow-xl transition-all",
        className,
      )}
    >
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30">
        <Image
          src="/avatars/melissa.webp"
          alt="Melissa"
          width={48}
          height={48}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="text-left">
        <div className="font-semibold">{t("chiamaMelissa")}</div>
        <div className="text-sm text-pink-100">{t("completaConLaVoce")}</div>
      </div>
      <Phone className="w-6 h-6 ml-2" />
    </motion.button>
  );
}
