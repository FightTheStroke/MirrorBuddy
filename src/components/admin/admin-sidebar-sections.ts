import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  BarChart3,
  FileText,
  Settings,
  Activity,
  Layers,
  ScrollText,
  Shield,
  Languages,
  Mail,
  TrendingUp,
  Heart,
  Server,
  Key,
  Monitor,
  CreditCard,
  Sliders,
  Palette,
  FunnelIcon as Funnel,
  BookOpen,
  FlaskConical,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  badgeColor?: "amber" | "red" | "blue";
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export function createNavSections(t: (key: string) => string): NavSection[] {
  return [
    {
      id: "people",
      label: "People",
      icon: Users,
      items: [
        {
          id: "users",
          label: t("sidebar.users"),
          href: "/admin/users",
          icon: Users,
        },
        {
          id: "invites",
          label: t("betaRequests"),
          href: "/admin/invites",
          icon: UserPlus,
        },
      ],
    },
    {
      id: "content",
      label: "Content",
      icon: Layers,
      items: [
        {
          id: "tiers",
          label: t("sidebar.tiers"),
          href: "/admin/tiers",
          icon: Layers,
        },
        {
          id: "audit-log",
          label: t("sidebar.auditLog"),
          href: "/admin/audit",
          icon: ScrollText,
        },
        {
          id: "characters",
          label: "Characters",
          href: "/admin/characters",
          icon: Palette,
        },
        {
          id: "knowledge",
          label: "Knowledge",
          href: "/admin/knowledge",
          icon: BookOpen,
        },
        {
          id: "locales",
          label: "Locales",
          href: "/admin/locales",
          icon: Languages,
        },
      ],
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      items: [
        {
          id: "dashboard",
          label: t("sidebar.dashboard"),
          href: "/admin",
          icon: LayoutDashboard,
        },
        {
          id: "analytics",
          label: t("sidebar.analytics"),
          href: "/admin/analytics",
          icon: BarChart3,
        },
        { id: "funnel", label: "Funnel", href: "/admin/funnel", icon: Funnel },
      ],
    },
    {
      id: "system",
      label: "System",
      icon: Settings,
      items: [
        {
          id: "service-limits",
          label: t("sidebar.serviceLimits"),
          href: "/admin/service-limits",
          icon: Activity,
        },
        { id: "safety", label: "Safety", href: "/admin/safety", icon: Shield },
        { id: "tos", label: t("terms"), href: "/admin/tos", icon: FileText },
        {
          id: "settings",
          label: t("sidebar.settings"),
          href: "/admin/settings",
          icon: Settings,
        },
      ],
    },
    {
      id: "ops",
      label: "Mission Control",
      icon: Monitor,
      items: [
        {
          id: "ops-dashboard",
          label: "Ops Dashboard",
          href: "/admin/mission-control/ops-dashboard",
          icon: Monitor,
        },
        {
          id: "control-panel",
          label: "Control Panel",
          href: "/admin/mission-control/control-panel",
          icon: Sliders,
        },
        {
          id: "health",
          label: "Health",
          href: "/admin/mission-control/health",
          icon: Heart,
        },
        {
          id: "infra",
          label: "Infrastructure",
          href: "/admin/mission-control/infra",
          icon: Server,
        },
        {
          id: "business-kpi",
          label: "Business KPI",
          href: "/admin/mission-control/business-kpi",
          icon: TrendingUp,
        },
        {
          id: "grafana",
          label: "Grafana",
          href: "/admin/mission-control/grafana",
          icon: BarChart3,
        },
        {
          id: "stripe",
          label: "Stripe",
          href: "/admin/mission-control/stripe",
          icon: CreditCard,
        },
        {
          id: "key-vault",
          label: "Key Vault",
          href: "/admin/mission-control/key-vault",
          icon: Key,
        },
        {
          id: "ai-email",
          label: "AI Email",
          href: "/admin/mission-control/ai-email",
          icon: Mail,
        },
        {
          id: "research-lab",
          label: "Research Lab",
          href: "/admin/research",
          icon: FlaskConical,
        },
      ],
    },
  ];
}
