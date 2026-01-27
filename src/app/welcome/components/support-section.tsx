"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Lightbulb, Heart } from "lucide-react";
import { getAllSupportTeachers } from "@/data/support-teachers";
import { getAllBuddies } from "@/data/buddy-profiles";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Get all coaches and buddies, combine them
  const supportMembers = useMemo(() => {
    const coaches = getAllSupportTeachers();
    const buddies = getAllBuddies();

    const members: SupportMember[] = [
      ...coaches.map((c) => ({
        id: c.id,
        name: c.name,
        role: "coach" as const,
        description: c.personality,
        avatar: c.avatar,
        color: c.color,
      })),
      ...buddies.map((b) => ({
        id: b.id,
        name: b.name,
        role: "buddy" as const,
        description: b.personality,
        avatar: b.avatar,
        color: b.color,
      })),
    ];

    return members;
  }, []);

  // Card width (w-44 = 176px) + gap (16px) = 192px per card
  const CARD_WIDTH = 192;
  const SCROLL_INTERVAL = 3000; // 3 seconds

  const scroll = useCallback((direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = CARD_WIDTH;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  }, []);

  // Auto-scroll functionality
  useEffect(() => {
    if (isPaused || !scrollRef.current) return;

    const interval = setInterval(() => {
      if (!scrollRef.current) return;

      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;

      // If at the end, reset to start
      if (scrollLeft >= maxScroll - 10) {
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
      {/* Section Header */}
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
          Sempre al tuo{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500">
            fianco
          </span>
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Coach per il metodo di studio e Buddy per il supporto emotivo
        </p>
      </motion.div>

      {/* Carousel Container */}
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors -ml-2"
          aria-label="Scorri a sinistra"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Scrollable Container - Fixed width to show exactly 5 cards */}
        <div
          className="overflow-hidden mx-auto"
          style={{ width: "min(100%, 960px)" }}
        >
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide py-4 px-2 scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            tabIndex={0}
            role="region"
            aria-label="Carosello coach e buddy - usa le frecce per navigare"
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
                    {isCoach ? "Coach" : "Buddy"}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-16 h-16 mx-auto mb-3 rounded-full p-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${member.color}, ${member.color}80)`,
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 overflow-hidden">
                      <Image
                        src={member.avatar}
                        alt={`${member.name} - ${isCoach ? "Coach" : "Buddy"}`}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Info */}
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

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors -mr-2"
          aria-label="Scorri a destra"
        >
          <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Scroll hint for mobile */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3 md:hidden">
        ← Scorri per vedere tutti →
      </p>
    </motion.section>
  );
}
