"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { User, Key, Settings, LogOut } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { cn } from "@/lib/utils";

interface UserMenuDropdownProps {
  userName?: string;
  className?: string;
}

export function UserMenuDropdown({
  userName,
  className,
}: UserMenuDropdownProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutGuardRef = useRef(false);

  const handleLogout = async () => {
    if (logoutGuardRef.current) return;
    logoutGuardRef.current = true;
    setIsLoggingOut(true);
    try {
      const response = await csrfFetch("/api/auth/logout", {
        method: "POST",
      });
      if (response.ok) {
        router.push("/login");
      }
    } catch {
      // Network error — don't redirect
    } finally {
      setIsLoggingOut(false);
      logoutGuardRef.current = false;
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg",
            "text-sm text-slate-600 dark:text-slate-400",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            "focus:outline-none focus:ring-2 focus:ring-accent-themed focus:ring-offset-2",
            "transition-colors",
            className,
          )}
          aria-label={t("userMenu.greeting")}
        >
          {userName ? (
            <>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {t("userMenu.greeting")}
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {userName}
              </span>
            </>
          ) : (
            <User className="h-5 w-5" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            "min-w-[220px] bg-white dark:bg-slate-800",
            "rounded-lg shadow-lg border border-slate-200 dark:border-slate-700",
            "p-1 z-50",
            "animate-in fade-in-0 zoom-in-95",
          )}
          align="end"
          sideOffset={8}
        >
          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md",
              "text-sm text-slate-700 dark:text-slate-300",
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              "focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700",
              "cursor-pointer transition-colors",
            )}
            onSelect={() => router.push("/settings")}
          >
            <User className="h-4 w-4" />
            <span>{t("userMenu.profile")}</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md",
              "text-sm text-slate-700 dark:text-slate-300",
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              "focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700",
              "cursor-pointer transition-colors",
            )}
            onSelect={() => router.push("/change-password")}
          >
            <Key className="h-4 w-4" />
            <span>{t("userMenu.changePassword")}</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md",
              "text-sm text-slate-700 dark:text-slate-300",
              "hover:bg-slate-100 dark:hover:bg-slate-700",
              "focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700",
              "cursor-pointer transition-colors",
            )}
            onSelect={() => router.push("/settings")}
          >
            <Settings className="h-4 w-4" />
            <span>{t("userMenu.settings")}</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

          <DropdownMenu.Item
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md",
              "text-sm text-red-600 dark:text-red-400",
              "hover:bg-red-50 dark:hover:bg-red-900/20",
              "focus:outline-none focus:bg-red-50 dark:focus:bg-red-900/20",
              "cursor-pointer transition-colors",
              isLoggingOut && "opacity-50 cursor-not-allowed",
            )}
            onSelect={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="h-4 w-4" />
            <span>{t("userMenu.logout")}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
