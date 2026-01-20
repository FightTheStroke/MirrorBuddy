"use client";

import {
  LayoutDashboard,
  TrendingUp,
  MessageSquareText,
  HelpCircle,
  Accessibility,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export type DashboardTab =
  | "panoramica"
  | "progressi"
  | "osservazioni"
  | "guida"
  | "accessibilita";

interface DashboardTabsProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  highContrast?: boolean;
  children: {
    panoramica: React.ReactNode;
    progressi: React.ReactNode;
    osservazioni: React.ReactNode;
    guida: React.ReactNode;
    accessibilita: React.ReactNode;
  };
  className?: string;
}

const TAB_CONFIG = [
  { value: "panoramica" as const, label: "Panoramica", icon: LayoutDashboard },
  { value: "progressi" as const, label: "Progressi", icon: TrendingUp },
  {
    value: "osservazioni" as const,
    label: "Osservazioni",
    icon: MessageSquareText,
  },
  { value: "guida" as const, label: "Guida", icon: HelpCircle },
  {
    value: "accessibilita" as const,
    label: "Accessibilità",
    icon: Accessibility,
  },
];

/**
 * Dashboard tabs navigation component.
 * WCAG 2.1 AA compliant with high contrast support.
 */
export function DashboardTabs({
  activeTab,
  onTabChange,
  highContrast = false,
  children,
  className,
}: DashboardTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as DashboardTab)}
      className={className}
    >
      <TabsList
        className={cn(
          "grid w-full grid-cols-3 sm:grid-cols-5 mb-6",
          highContrast && "bg-black border border-yellow-400",
        )}
      >
        {TAB_CONFIG.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className={cn(
              "flex items-center gap-2 text-xs sm:text-sm",
              highContrast &&
                "data-[state=active]:bg-yellow-400 data-[state=active]:text-black",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="panoramica">{children.panoramica}</TabsContent>
      <TabsContent value="progressi">{children.progressi}</TabsContent>
      <TabsContent value="osservazioni">{children.osservazioni}</TabsContent>
      <TabsContent value="guida">{children.guida}</TabsContent>
      <TabsContent value="accessibilita">{children.accessibilita}</TabsContent>
    </Tabs>
  );
}
