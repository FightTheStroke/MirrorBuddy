import { Check, Users, MessageCircle, Mic, Star } from "lucide-react";
import type { ReactNode } from "react";

export interface TierFeature {
  icon: ReactNode;
  text: string;
  highlight?: boolean;
}

export interface TierCard {
  name: string;
  tagline: string;
  price: string;
  features: TierFeature[];
  cta: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  highlight?: boolean;
  badge?: string;
}

export function createTierCards(t: (key: string) => string): TierCard[] {
  return [
    {
      name: t("tiers.trial.name"),
      tagline: t("tiers.trial.tagline"),
      price: t("tiers.trial.price"),
      badge: undefined,
      features: [
        {
          icon: <Users className="w-4 h-4" />,
          text: t("tiers.trial.features.maestri"),
        },
        {
          icon: <MessageCircle className="w-4 h-4" />,
          text: t("tiers.trial.features.messages"),
        },
        {
          icon: <Mic className="w-4 h-4" />,
          text: t("tiers.trial.features.voice"),
        },
        {
          icon: <Check className="w-4 h-4" />,
          text: t("tiers.trial.features.noRegistration"),
        },
      ],
      cta: {
        text: t("tiers.trial.cta"),
        href: "/welcome?skip=true",
      },
    },
    {
      name: t("tiers.base.name"),
      tagline: t("tiers.base.tagline"),
      price: t("tiers.base.price"),
      badge: t("tiers.base.badge"),
      highlight: true,
      features: [
        {
          icon: <Users className="w-4 h-4" />,
          text: t("tiers.base.features.maestri"),
        },
        {
          icon: <MessageCircle className="w-4 h-4" />,
          text: t("tiers.base.features.messages"),
        },
        {
          icon: <Mic className="w-4 h-4" />,
          text: t("tiers.base.features.voice"),
        },
        {
          icon: <Check className="w-4 h-4" />,
          text: t("tiers.base.features.savedProgress"),
          highlight: true,
        },
      ],
      cta: {
        text: t("tiers.base.cta"),
        href: "/login",
      },
    },
    {
      name: t("tiers.pro.name"),
      tagline: t("tiers.pro.tagline"),
      price: t("tiers.pro.price"),
      features: [
        {
          icon: <Users className="w-4 h-4" />,
          text: t("tiers.pro.features.maestri"),
        },
        {
          icon: <MessageCircle className="w-4 h-4" />,
          text: t("tiers.pro.features.messagesUnlimited"),
          highlight: true,
        },
        {
          icon: <Mic className="w-4 h-4" />,
          text: t("tiers.pro.features.voiceUnlimited"),
          highlight: true,
        },
        {
          icon: <Star className="w-4 h-4" />,
          text: t("tiers.pro.features.allTools"),
          highlight: true,
        },
      ],
      cta: {
        text: t("tiers.pro.cta"),
        href: "/login",
      },
    },
  ];
}
