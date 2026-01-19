"use client";

import {
  GraduationCap,
  Brain,
  Sparkles,
  Accessibility,
  MessageSquare,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureGuideCardsProps {
  highContrast?: boolean;
  className?: string;
}

interface FeatureCardData {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const FEATURES: FeatureCardData[] = [
  {
    icon: <GraduationCap className="w-5 h-5" />,
    title: "20 AI Maestri",
    description:
      "Tutor virtuali specializzati in diverse materie, ognuno con personalità e approccio unico.",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "Flashcard FSRS",
    description:
      "Sistema di ripetizione spaziata scientificamente ottimizzato per la memorizzazione a lungo termine.",
    color:
      "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Quiz Adattivi",
    description:
      "Quiz che si adattano al livello dello studente per un apprendimento personalizzato.",
    color:
      "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    icon: <Accessibility className="w-5 h-5" />,
    title: "Accessibilità DSA",
    description:
      "7 profili specifici per dislessia, ADHD, e altre difficoltà di apprendimento.",
    color:
      "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Conversazioni Vocali",
    description:
      "Interazione tramite voce per un apprendimento più naturale e accessibile.",
    color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "Mappe Mentali",
    description:
      "Generazione automatica di mappe concettuali per visualizzare le connessioni.",
    color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  },
];

/**
 * Feature guide cards explaining MirrorBuddy functionality.
 * WCAG 2.1 AA compliant with high contrast support.
 */
export function FeatureGuideCards({
  highContrast = false,
  className,
}: FeatureGuideCardsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
        className,
      )}
      role="list"
      aria-label="Lista funzionalità"
    >
      {FEATURES.map((feature) => (
        <article
          key={feature.title}
          className={cn(
            "p-4 rounded-xl border transition-all",
            highContrast
              ? "bg-black border-yellow-400 hover:bg-yellow-400/10"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md",
          )}
          role="listitem"
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "shrink-0 p-2 rounded-lg",
                highContrast ? "bg-yellow-400 text-black" : feature.color,
              )}
              aria-hidden="true"
            >
              {feature.icon}
            </div>
            <div>
              <h3
                className={cn(
                  "font-semibold mb-1",
                  highContrast
                    ? "text-yellow-400"
                    : "text-slate-900 dark:text-white",
                )}
              >
                {feature.title}
              </h3>
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  highContrast
                    ? "text-yellow-200"
                    : "text-slate-600 dark:text-slate-400",
                )}
              >
                {feature.description}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
