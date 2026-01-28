"use client";

import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { AITransparencyContent } from "./content";

const AI_TRANSPARENCY_VERSION = "1.0";
const LAST_UPDATED = "20 Gennaio 2026";

export default function AITransparencyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav
        className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 print:border-b-2"
        aria-label="Navigazione pagina"
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors print:hidden"
            aria-label="Torna alla home page di MirrorBuddy"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Torna alla home
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 print:py-8">
        <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12 print:shadow-none print:rounded-none">
          {/* Title */}
          <div className="mb-8 pb-8 border-b border-slate-200 dark:border-gray-700">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Trasparenza sull&apos;Intelligenza Artificiale
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-gray-400">
              <span>Versione {AI_TRANSPARENCY_VERSION}</span>
              <span>•</span>
              <span>Ultimo aggiornamento: {LAST_UPDATED}</span>
            </div>
          </div>

          {/* TL;DR Box */}
          <section
            className="mb-12 p-6 bg-blue-50 dark:bg-blue-900/30 rounded-xl border-l-4 border-blue-500 print:bg-transparent print:border print:border-blue-500"
            aria-labelledby="tldr-heading"
          >
            <h2
              id="tldr-heading"
              className="text-2xl font-bold text-slate-900 dark:text-white mb-4"
            >
              In breve (TL;DR)
            </h2>
            <ul className="space-y-2 text-slate-700 dark:text-gray-300 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1" aria-hidden="true">
                  ✓
                </span>
                <span>
                  MirrorBuddy usa IA (Azure OpenAI) per insegnare, non per
                  decidere
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1" aria-hidden="true">
                  ✓
                </span>
                <span>
                  I 22 Maestri IA hanno conoscenze verificate e controllate
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1" aria-hidden="true">
                  ✓
                </span>
                <span>
                  Gli insegnanti vedono sempre tutte le chat e possono
                  intervenire
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1" aria-hidden="true">
                  ✓
                </span>
                <span>
                  Puoi rifiutare l&apos;IA quando vuoi, senza conseguenze
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1" aria-hidden="true">
                  ✓
                </span>
                <span>
                  Rispettiamo il GDPR e la legge italiana sulla privacy
                </span>
              </li>
            </ul>
          </section>

          {/* Main Sections */}
          <AITransparencyContent />

          {/* Links Section */}
          <section className="mt-12 pt-8 border-t border-slate-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Documenti Correlati
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/privacy"
                className="block p-4 rounded-lg border border-slate-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  Privacy Policy
                </h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Come proteggiamo i tuoi dati
                </p>
              </Link>
              <Link
                href="/terms"
                className="block p-4 rounded-lg border border-slate-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  Termini di Servizio
                </h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Le regole d&apos;uso di MirrorBuddy
                </p>
              </Link>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-gray-700">
            <p className="text-slate-600 dark:text-gray-400 text-center">
              Domande sull&apos;IA in MirrorBuddy? Scrivici:{" "}
              <a
                href="mailto:compliance@mirrorbuddy.it"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline"
                aria-label="Invia email a compliance@mirrorbuddy.it per domande sulla trasparenza IA"
              >
                compliance@mirrorbuddy.it
              </a>
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
