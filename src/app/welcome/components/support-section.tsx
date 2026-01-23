"use client";

import { useRef, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Lightbulb, Heart } from "lucide-react";
import { getAllSupportTeachers } from "@/data/support-teachers";
import { getAllBuddies } from "@/data/buddy-profiles";

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
 * Shows all coaches and buddies in a single horizontal carousel.
 * Coaches help with study methods, Buddies provide peer emotional support.
 */
export function SupportSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get all coaches and buddies, combine and shuffle
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

    return shuffleArray(members);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const coachCount = supportMembers.filter((m) => m.role === "coach").length;
  const buddyCount = supportMembers.filter((m) => m.role === "buddy").length;

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
          {coachCount} Coach per il metodo di studio e {buddyCount} Buddy per il
          supporto emotivo
        </p>
      </motion.div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors -ml-2"
          aria-label="Scorri a sinistra"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Scrollable Container */}
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: 1.0 + i * 0.05,
                  type: "spring",
                  stiffness: 150,
                  damping: 15,
                }}
                className="flex-shrink-0 w-36 bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all"
              >
                {/* Role Badge */}
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 ${
                    isCoach
                      ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  }`}
                >
                  <RoleIcon className="w-3 h-3" />
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
