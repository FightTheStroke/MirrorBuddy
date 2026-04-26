"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface MaestroCard {
  id: string;
  name: string;
  displayName: string;
  avatar: string;
  color: string;
  subject: string;
}

/**
 * Professori Showcase Section - Horizontal Carousel
 *
 * THE PRIMARY VALUE PROPOSITION of MirrorBuddy:
 * Learn WITH the greatest minds in history, not just ABOUT them.
 *
 * Shows ALL professors in a scrollable horizontal carousel (5 visible at a time).
 * Auto-scrolls to show all professors.
 */
export function MaestriShowcaseSection() {
  const t = useTranslations("welcome.maestri");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [displayedMaestri, setDisplayedMaestri] = useState<MaestroCard[]>([]);
  const subjectsMap = t.raw("subjects") as Record<string, string>;

  // Lazy-load maestri to avoid pulling in heavy systemPrompt chain at compile time
  useEffect(() => {
    import("@/data/maestri").then((mod) => {
      setDisplayedMaestri(
        mod.maestri.map(
          ({ id, name, displayName, avatar, color, subject }: MaestroCard) => ({
            id,
            name,
            displayName,
            avatar,
            color,
            subject,
          }),
        ),
      );
    });
  }, []);

  const CARD_WIDTH = 192;
  const SCROLL_INTERVAL = 3000;

  const scroll = useCallback((direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -CARD_WIDTH : CARD_WIDTH,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    if (isPaused || !scrollRef.current) return;
    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (scrollLeft >= scrollWidth - clientWidth - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scroll("right");
      }
    }, SCROLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, scroll]);

  const getSubjectName = (subject: string): string => {
    const key = subject.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    return subjectsMap[key] ?? subject;
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="w-full max-w-6xl mx-auto px-4 mb-16 mt-8"
      aria-labelledby="maestri-heading"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center mb-8"
      >
        <h2
          id="maestri-heading"
          className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3"
        >
          {t("heading")}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
            {t("headingHighlight")}
          </span>
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t("subtitle", { count: displayedMaestri.length })}
        </p>
      </motion.div>

      <div
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors -ml-2"
          aria-label={t("scrollLeft")}
        >
          <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>

        <div
          className="overflow-hidden mx-auto"
          style={{ width: "min(100%, 960px)" }}
        >
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide py-4 px-2 scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            role="region"
            aria-label={t("carouselLabel")}
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- WCAG: scrollable regions need tabIndex for keyboard access
            tabIndex={0}
          >
            {displayedMaestri.map((maestro, i) => (
              <motion.div
                key={maestro.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.6 + i * 0.03,
                  type: "spring",
                  stiffness: 150,
                  damping: 15,
                }}
                className="flex-shrink-0 w-44 bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-600 transition-all"
              >
                <div
                  className="w-16 h-16 mx-auto mb-3 rounded-full p-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${maestro.color}, ${maestro.color}80)`,
                  }}
                >
                  <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 overflow-hidden">
                    <Image
                      src={maestro.avatar}
                      alt={`${maestro.displayName} - ${getSubjectName(maestro.subject)}`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1 leading-tight">
                  {maestro.displayName}
                </h3>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {getSubjectName(maestro.subject)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors -mr-2"
          aria-label={t("scrollRight")}
        >
          <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3 md:hidden">
        {t("scrollHint")}
      </p>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4 max-w-2xl mx-auto">
        {t("disclaimer")}{" "}
        <Link
          href="/ai-transparency"
          className="underline hover:text-gray-600 dark:hover:text-gray-400"
        >
          {t("disclaimerLink")}
        </Link>
      </p>
    </motion.section>
  );
}
