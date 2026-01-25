"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { tierCards } from "./tier-data";
import { b2bTierCards } from "./b2b-tier-data";
import { SegmentedToggle } from "./segmented-toggle";

type ViewMode = "individuals" | "organizations";

export function TierComparisonSection() {
  const [viewMode, setViewMode] = useState<ViewMode>("individuals");

  const isB2BView = viewMode === "organizations";
  const currentCards = isB2BView ? b2bTierCards : tierCards;

  // Dynamic content based on view mode
  const content = {
    individuals: {
      heading: "Scegli il piano perfetto per te",
      subtitle:
        "Inizia con una prova gratuita oppure registrati per sbloccare più funzionalità",
    },
    organizations: {
      heading: "Soluzioni per la tua organizzazione",
      subtitle: "Personalizzazione completa per scuole e aziende",
    },
  };

  const currentContent = content[viewMode];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="w-full max-w-7xl mx-auto px-4 mt-16 mb-12"
      aria-labelledby="tier-comparison-heading"
    >
      {/* Toggle Section */}
      <div className="flex justify-center mb-8">
        <SegmentedToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Animated Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h2
              id="tier-comparison-heading"
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            >
              {currentContent.heading}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {currentContent.subtitle}
            </p>
          </div>

          {/* Cards Grid */}
          <div
            className={
              isB2BView ? "max-w-3xl mx-auto" : "w-full" // Centered for B2B, full width for B2C
            }
          >
            <div
              className={`grid gap-6 ${
                isB2BView
                  ? "grid-cols-1 md:grid-cols-2" // 2 columns for B2B
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" // 3 columns for B2C
              }`}
            >
              {currentCards.map((tier, index) => (
                <motion.div
                  key={`${viewMode}-${tier.name}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className={`relative flex flex-col p-6 rounded-2xl border-2 shadow-lg transition-all hover:shadow-xl ${
                    tier.highlight
                      ? "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-400 dark:border-purple-600 scale-105 lg:scale-110"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full shadow-md">
                        <Zap className="w-3 h-3" aria-hidden="true" />
                        {tier.badge}
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {tier.tagline}
                    </p>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {tier.price}
                    </div>
                  </div>

                  <ul className="flex-1 space-y-3 mb-6">
                    {tier.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-start gap-3 text-gray-700 dark:text-gray-200"
                      >
                        <span
                          className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${
                            feature.highlight
                              ? "bg-purple-100 dark:bg-purple-800/50 text-purple-600 dark:text-purple-300"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {feature.icon}
                        </span>
                        <span
                          className={`text-base ${
                            feature.highlight ? "font-semibold" : "font-medium"
                          }`}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {tier.cta.href ? (
                    <Link href={tier.cta.href} className="w-full">
                      <Button
                        size="lg"
                        className={`w-full shadow-md ${
                          tier.highlight
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                        }`}
                      >
                        {tier.name === "Trial" && (
                          <Sparkles
                            className="w-4 h-4 mr-2"
                            aria-hidden="true"
                          />
                        )}
                        {tier.cta.text}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="lg"
                      onClick={tier.cta.onClick}
                      className={`w-full shadow-md ${
                        tier.highlight
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                          : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                      }`}
                    >
                      {tier.cta.text}
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer Text */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              {isB2BView
                ? "Contattaci per una consulenza personalizzata e un preventivo su misura"
                : "Tutti i piani includono accesso ai 22 Maestri AI e strumenti di apprendimento personalizzati"}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}
