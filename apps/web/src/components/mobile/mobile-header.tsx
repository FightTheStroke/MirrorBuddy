"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface MobileHeaderProps {
  title?: string;
  onMenuClick: () => void;
  showAvatar?: boolean;
  className?: string;
}

export function MobileHeader({
  title,
  onMenuClick,
  showAvatar = true,
  className,
}: MobileHeaderProps) {
  const t = useTranslations("common");
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 sm:hidden",
        "h-14 bg-white dark:bg-slate-900 border-b",
        "flex items-center justify-between px-4",
        "pt-[env(safe-area-inset-top)]",
        className,
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="min-w-[44px] min-h-[44px]"
        aria-label={t("menu")}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {title && (
        <h1 className="text-lg font-semibold truncate flex-1 text-center mx-4">
          {title}
        </h1>
      )}

      {showAvatar && (
        <div className="min-w-[44px] min-h-[44px] flex items-center justify-center">
          {/* Avatar placeholder - integrate with user context later */}
          <div className="w-8 h-8 rounded-full bg-primary/10" />
        </div>
      )}
    </header>
  );
}
