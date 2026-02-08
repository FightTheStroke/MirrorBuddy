"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Lightbulb, Heart } from "lucide-react";
import { useTranslations } from "next-intl";

interface SupportMember {
  id: string;
  name: string;
  role: "coach" | "buddy";
  description: string;
  avatar: string;
  color: string;
}

/**
 * Support Section - Coaches and Buddies Carousel
 *
 * Shows ALL coaches and buddies in a horizontal carousel (5 visible at a time).
 * Auto-scrolls to show all members.
 * Coaches help with study methods, Buddies provide peer emotional support.
 */
export function SupportSection() {
  const t = useTranslations("welcome.support");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [supportMembers, setSupportMembers] = useState<SupportMember[]>([]);

  // Lazy-load coaches and buddies to avoid heavy import chain at compile time
  useEffect(() => {
    Promise.all([
      import("@/data/support-teachers"),
      import("@/data/buddy-profiles"),
    ]).then(([teachersMod, buddiesMod]) => {
      const coaches = teachersMod.getAllSupportTeachers();
      const buddies = buddiesMod.getAllBuddies();
      setSupportMembers([
        ...coaches.map(
          (c: {
            id: string;
            name: string;
            personality: string;
            avatar: string;
            color: string;
          }) => ({
            id: c.id,
            name: c.name,
            role: "coach" as const,
            description: c.personality,
            avatar: c.avatar,
            color: c.color,
          }),
        ),
        ...buddies.map(
          (b: {
            id: string;
            name: string;
            personality: string;
            avatar: string;
            color: string;
          }) => ({
            id: b.id,
            name: b.name,
            role: "buddy" as const,
            description: b.personality,
            avatar: b.avatar,
            color: b.color,
          }),
        ),
      ]);
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

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="w-full max-w-6xl mx-auto px-4 mb-12"
      aria-labelledby="support-heading"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="text-center mb-8"
      >
        <h2
          id="support-heading"
          className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3"
        >
          {t("heading")}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
            {t("headingHighlight")}
          </span>
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {t("subtitle")}
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
            {supportMembers.map((member, i) => {
              const isCoach = member.role === "coach";
              const RoleIcon = isCoach ? Lightbulb : Heart;

              return (
                <motion.div
                  key={member.id}
                  initial={{ scale: 0.95, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{
                    delay: 0.3 + i * 0.05,
                    type: "spring",
                    stiffness: 150,
                    damping: 15,
                  }}
                  className="flex-shrink-0 w-44 bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all"
                >
                  {/* Role Badge - uses high contrast colors for WCAG 2.1 AA compliance */}
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 ${
                      isCoach
                        ? "bg-pink-200 text-pink-950 dark:bg-pink-900/50 dark:text-pink-200"
                        : "bg-amber-200 text-amber-950 dark:bg-amber-900/50 dark:text-amber-200"
                    }`}
                  >
                    <RoleIcon className="w-3 h-3" aria-hidden="true" />
                    {isCoach ? t("coachLabel") : t("buddyLabel")}
                  </div>

                  <div
                    className="w-16 h-16 mx-auto mb-3 rounded-full p-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${member.color}, ${member.color}80)`,
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 overflow-hidden">
                      <Image
                        src={member.avatar}
                        alt={`${member.name} - ${isCoach ? t("coachLabel") : t("buddyLabel")}`}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    {member.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {member.description}
                  </p>
                </motion.div>
              );
            })}
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
    </motion.section>
  );
}
