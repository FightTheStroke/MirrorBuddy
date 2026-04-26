import { useTranslations } from "next-intl";
import {
  User,
  Accessibility,
  Palette,
  Bell,
  Shield,
  BarChart3,
  Users,
  UserCircle,
  Bot,
  Volume2,
  Music,
  Wrench,
  Cloud,
} from "lucide-react";

export type SettingsTab =
  | "profile"
  | "characters"
  | "accessibility"
  | "appearance"
  | "ai"
  | "audio"
  | "ambient-audio"
  | "integrations"
  | "notifications"
  | "telemetry"
  | "privacy"
  | "genitori"
  | "diagnostics";

export interface SettingsTabDef {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
}

export function useSettingsTabs(): SettingsTabDef[] {
  const t = useTranslations("settings.tabs");

  return [
    { id: "profile", label: t("profile"), icon: <User className="w-5 h-5" /> },
    {
      id: "characters",
      label: t("characters"),
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: "accessibility",
      label: t("accessibility"),
      icon: <Accessibility className="w-5 h-5" />,
    },
    {
      id: "appearance",
      label: t("appearance"),
      icon: <Palette className="w-5 h-5" />,
    },
    { id: "ai", label: t("aiProvider"), icon: <Bot className="w-5 h-5" /> },
    { id: "audio", label: t("audio"), icon: <Volume2 className="w-5 h-5" /> },
    {
      id: "ambient-audio",
      label: t("ambientAudio"),
      icon: <Music className="w-5 h-5" />,
    },
    {
      id: "integrations",
      label: t("integrations"),
      icon: <Cloud className="w-5 h-5" />,
    },
    {
      id: "notifications",
      label: t("notifications"),
      icon: <Bell className="w-5 h-5" />,
    },
    {
      id: "telemetry",
      label: t("statistics"),
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: "privacy",
      label: t("privacy"),
      icon: <Shield className="w-5 h-5" />,
    },
    {
      id: "genitori",
      label: t("parents"),
      icon: <UserCircle className="w-5 h-5" />,
    },
    {
      id: "diagnostics",
      label: t("diagnostics"),
      icon: <Wrench className="w-5 h-5" />,
    },
  ];
}

// Fallback export for static access during component initialization
export const SETTINGS_TABS: SettingsTabDef[] = [];
