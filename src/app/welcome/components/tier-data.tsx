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

export const tierCards: TierCard[] = [
  {
    name: "Trial",
    tagline: "Esplora senza impegno",
    price: "Gratis",
    badge: undefined,
    features: [
      {
        icon: <Users className="w-4 h-4" />,
        text: "3 Maestri",
      },
      {
        icon: <MessageCircle className="w-4 h-4" />,
        text: "10 messaggi/giorno",
      },
      {
        icon: <Mic className="w-4 h-4" />,
        text: "5 minuti voce/giorno",
      },
      {
        icon: <Check className="w-4 h-4" />,
        text: "Nessuna registrazione",
      },
    ],
    cta: {
      text: "Prova gratis",
      href: "/welcome?skip=true",
    },
  },
  {
    name: "Base",
    tagline: "Per studenti registrati",
    price: "Gratis",
    badge: "Consigliato",
    highlight: true,
    features: [
      {
        icon: <Users className="w-4 h-4" />,
        text: "10 Maestri",
      },
      {
        icon: <MessageCircle className="w-4 h-4" />,
        text: "30 messaggi/giorno",
      },
      {
        icon: <Mic className="w-4 h-4" />,
        text: "15 minuti voce/giorno",
      },
      {
        icon: <Check className="w-4 h-4" />,
        text: "Progressi salvati",
        highlight: true,
      },
    ],
    cta: {
      text: "Registrati",
      href: "/login",
    },
  },
  {
    name: "Pro",
    tagline: "Esperienza completa",
    price: "A richiesta",
    features: [
      {
        icon: <Users className="w-4 h-4" />,
        text: "22 Maestri",
      },
      {
        icon: <MessageCircle className="w-4 h-4" />,
        text: "Messaggi illimitati",
        highlight: true,
      },
      {
        icon: <Mic className="w-4 h-4" />,
        text: "Voce illimitata",
        highlight: true,
      },
      {
        icon: <Star className="w-4 h-4" />,
        text: "Tutti gli strumenti",
        highlight: true,
      },
    ],
    cta: {
      text: "Upgrade a Pro",
      href: "/login",
    },
  },
];
