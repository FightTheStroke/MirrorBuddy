"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface Guide {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar: string;
  color: string;
  category: "coach" | "buddy" | "maestro";
}

const GUIDES: Guide[] = [
  // COACH
  {
    id: "melissa",
    name: "Melissa",
    role: "Learning Coach",
    description: "Ti guida nel tuo metodo di studio personalizzato",
    avatar: "/avatars/melissa.webp",
    color: "from-pink-400 to-rose-500",
    category: "coach",
  },
  // BUDDY
  {
    id: "enea",
    name: "Enea",
    role: "Peer Buddy",
    description: "Compagno allegro che sa tirare su il morale",
    avatar: "/avatars/enea.webp",
    color: "from-amber-400 to-orange-500",
    category: "buddy",
  },
  // MAESTRI - Avatar REALI dalla cartella public/maestri/
  {
    id: "euclide",
    name: "Euclide",
    role: "Maestro di Matematica",
    description: "Esperto di algebra, geometria e aritmetica",
    avatar: "/maestri/euclide.webp",
    color: "from-blue-400 to-cyan-500",
    category: "maestro",
  },
  {
    id: "curie",
    name: "Marie Curie",
    role: "Maestra di Chimica",
    description: "Pioniera della scienza, due premi Nobel!",
    avatar: "/maestri/curie.webp",
    color: "from-purple-400 to-pink-500",
    category: "maestro",
  },
  {
    id: "leonardo",
    name: "Leonardo da Vinci",
    role: "Maestro di Arte",
    description: "Genio del Rinascimento, artista e inventore",
    avatar: "/maestri/leonardo.webp",
    color: "from-indigo-400 to-purple-500",
    category: "maestro",
  },
  {
    id: "shakespeare",
    name: "Shakespeare",
    role: "Maestro di Inglese",
    description: "Il più grande drammaturgo di tutti i tempi",
    avatar: "/maestri/shakespeare.webp",
    color: "from-emerald-400 to-teal-500",
    category: "maestro",
  },
  {
    id: "feynman",
    name: "Richard Feynman",
    role: "Maestro di Fisica",
    description: "Premio Nobel, spiega la fisica con passione",
    avatar: "/maestri/feynman.webp",
    color: "from-cyan-400 to-blue-500",
    category: "maestro",
  },
  {
    id: "erodoto",
    name: "Erodoto",
    role: "Maestro di Storia",
    description: "Il padre della storia, racconta il passato",
    avatar: "/maestri/erodoto.webp",
    color: "from-orange-400 to-red-500",
    category: "maestro",
  },
];

/**
 * Guides Section for MirrorBuddy Welcome Page
 *
 * Introduces the AI characters:
 * - Coaches (learning support)
 * - Buddies (emotional support)
 * - Maestri (subject experts)
 *
 * Part of Wave 3: Welcome Experience Enhancement
 */
export function GuidesSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="w-full max-w-4xl mx-auto px-4 mb-12"
      aria-labelledby="guides-heading"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center mb-8"
      >
        <h2
          id="guides-heading"
          className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3"
        >
          Incontra i tuoi{" "}
          <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Compagni di Viaggio
          </span>
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Coach, Buddies e Maestri pronti ad aiutarti in ogni momento
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {GUIDES.map((guide, i) => {
          const categoryLabel =
            guide.category === "coach"
              ? "Coach"
              : guide.category === "buddy"
                ? "Buddy"
                : "Maestro";
          const categoryColor =
            guide.category === "coach"
              ? "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300"
              : guide.category === "buddy"
                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";

          return (
            <motion.div
              key={guide.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.7 + i * 0.1,
                type: "spring",
                stiffness: 200,
              }}
              className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              {/* Category Badge */}
              <div className="mb-3">
                <span
                  className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${categoryColor}`}
                >
                  {categoryLabel}
                </span>
              </div>

              {/* Avatar */}
              <div
                className={`w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br ${guide.color} p-1 group-hover:scale-110 transition-transform duration-300`}
              >
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 overflow-hidden">
                  <Image
                    src={guide.avatar}
                    alt={`${guide.name} - ${guide.role}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Info */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                {guide.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
                {guide.role}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {guide.description}
              </p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="text-center mt-8 p-6 bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 dark:from-pink-900/20 dark:via-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-pink-200 dark:border-pink-800"
      >
        <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Un intero team al tuo servizio!
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center text-sm">
          <div>
            <strong className="text-pink-600 dark:text-pink-400">
              5 Coaches
            </strong>
            <span className="text-gray-600 dark:text-gray-400">
              {" "}
              per il metodo di studio
            </span>
          </div>
          <span className="hidden md:inline text-gray-400">•</span>
          <div>
            <strong className="text-orange-600 dark:text-orange-400">
              5 Buddies
            </strong>
            <span className="text-gray-600 dark:text-gray-400">
              {" "}
              per il supporto emotivo
            </span>
          </div>
          <span className="hidden md:inline text-gray-400">•</span>
          <div>
            <strong className="text-blue-600 dark:text-blue-400">
              17 Maestri
            </strong>
            <span className="text-gray-600 dark:text-gray-400">
              {" "}
              esperti di materia
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Galileo, Darwin, Manzoni, Erodoto, Mozart, Socrate, Feynman e tanti
          altri ti aspettano!
        </p>
      </motion.div>
    </motion.section>
  );
}
