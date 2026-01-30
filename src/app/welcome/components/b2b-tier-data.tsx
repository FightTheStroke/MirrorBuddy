import { BookOpen, Users, BarChart3, Headphones } from "lucide-react";
import type { TierCard } from "./tier-data";

export { type TierCard } from "./tier-data";

export function createB2bTierCards(t: (key: string) => string): TierCard[] {
  return [
    {
      name: t("tiers.schools.name"),
      tagline: t("tiers.schools.tagline"),
      price: t("tiers.schools.price"),
      badge: t("tiers.schools.badge"),
      highlight: true,
      features: [
        {
          icon: <BookOpen className="w-4 h-4" />,
          text: t("tiers.schools.features.curriculum"),
        },
        {
          icon: <Users className="w-4 h-4" />,
          text: t("tiers.schools.features.classManagement"),
        },
        {
          icon: <BarChart3 className="w-4 h-4" />,
          text: t("tiers.schools.features.teacherReports"),
        },
        {
          icon: <Headphones className="w-4 h-4" />,
          text: t("tiers.schools.features.dedicatedSupport"),
        },
      ],
      cta: {
        text: t("tiers.schools.cta"),
        href: "/contact/schools",
      },
    },
    {
      name: t("tiers.enterprise.name"),
      tagline: t("tiers.enterprise.tagline"),
      price: t("tiers.enterprise.price"),
      features: [
        {
          icon: <Users className="w-4 h-4" />,
          text: t("tiers.enterprise.features.customThemes"),
        },
        {
          icon: <BookOpen className="w-4 h-4" />,
          text: t("tiers.enterprise.features.customBranding"),
        },
        {
          icon: <BarChart3 className="w-4 h-4" />,
          text: t("tiers.enterprise.features.advancedAnalytics"),
        },
        {
          icon: <Headphones className="w-4 h-4" />,
          text: t("tiers.enterprise.features.accountManager"),
        },
      ],
      cta: {
        text: t("tiers.enterprise.cta"),
        href: "/contact/enterprise",
      },
    },
  ];
}
