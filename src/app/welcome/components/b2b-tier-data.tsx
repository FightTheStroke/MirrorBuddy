import { BookOpen, Users, BarChart3, Headphones } from "lucide-react";
import type { TierCard } from "./tier-data";

export { type TierCard } from "./tier-data";

export const b2bTierCards: TierCard[] = [
  {
    name: "Scuole",
    tagline: "Per istituti scolastici",
    price: "Personalizzato",
    badge: "Per le Scuole",
    highlight: true,
    features: [
      {
        icon: <BookOpen className="w-4 h-4" />,
        text: "Personalizzazione curricolare",
      },
      {
        icon: <Users className="w-4 h-4" />,
        text: "Gestione classi",
      },
      {
        icon: <BarChart3 className="w-4 h-4" />,
        text: "Report docenti",
      },
      {
        icon: <Headphones className="w-4 h-4" />,
        text: "Supporto dedicato",
      },
    ],
    cta: {
      text: "Contattaci",
      href: "/contact/schools",
    },
  },
  {
    name: "Enterprise",
    tagline: "Per aziende e organizzazioni",
    price: "Personalizzato",
    features: [
      {
        icon: <Users className="w-4 h-4" />,
        text: "Temi custom (Leadership, AI, Soft Skills)",
      },
      {
        icon: <BookOpen className="w-4 h-4" />,
        text: "Branding personalizzato",
      },
      {
        icon: <BarChart3 className="w-4 h-4" />,
        text: "Analytics avanzate",
      },
      {
        icon: <Headphones className="w-4 h-4" />,
        text: "Account manager dedicato",
      },
    ],
    cta: {
      text: "Contattaci",
      href: "/contact/enterprise",
    },
  },
];
