'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TermsContent } from './content';

export const TOS_VERSION = '1.0';
const LAST_UPDATED = '18 Gennaio 2025';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 print:border-b-2">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors print:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 print:py-8">
        <article className="bg-white rounded-2xl shadow-lg p-8 md:p-12 print:shadow-none print:rounded-none">
          {/* Title */}
          <header className="mb-8 pb-8 border-b border-slate-200">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Termini di Servizio di MirrorBuddy
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span>Versione {TOS_VERSION}</span>
              <span>•</span>
              <span>Ultimo aggiornamento: {LAST_UPDATED}</span>
            </div>
          </header>

          {/* TL;DR Box */}
          <section className="mb-12 p-6 bg-blue-50 rounded-xl border-l-4 border-blue-500 print:bg-transparent print:border print:border-blue-500">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              In breve (TL;DR)
            </h2>
            <ul className="space-y-2 text-slate-700 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">✓</span>
                <span>MirrorBuddy è gratuito, fatto per aiutare</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">✓</span>
                <span>Non siamo una scuola, l&apos;AI può sbagliare</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">✓</span>
                <span>Usalo con un adulto vicino se sei minorenne</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">✓</span>
                <span>Rispetta gli altri, noi rispettiamo te</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">✓</span>
                <span>Problemi? Scrivici, siamo qui per aiutare</span>
              </li>
            </ul>
          </section>

          {/* Main Sections */}
          <TermsContent />

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-slate-200">
            <p className="text-slate-600 text-center">
              Domande? Scrivici:{' '}
              <a
                href="mailto:info@fightthestroke.org"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                info@fightthestroke.org
              </a>
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
}
