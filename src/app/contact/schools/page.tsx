import { Metadata } from "next";
import { SchoolsContactForm } from "./schools-form";

export const metadata: Metadata = {
  title: "Contattaci - Scuole",
  description:
    "Contatta MirrorBuddy per soluzioni personalizzate per la tua scuola. Personalizzazione curricolare, gestione classi, report docenti e supporto dedicato.",
};

export default function SchoolsContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Contattaci
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Scopri come MirrorBuddy può trasformare l&apos;insegnamento nella
            tua scuola
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            Compila il modulo e il nostro team ti contatterà per discutere una
            soluzione personalizzata per i tuoi insegnanti e studenti.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 md:p-12">
          <SchoolsContactForm />
        </div>

        {/* Support Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center text-slate-600 dark:text-slate-300 text-sm">
          <p>
            Per domande urgenti o per parlare direttamente con il nostro team,
            contattaci a{" "}
            <a
              href="mailto:schools@mirrorbuddy.ai"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              schools@mirrorbuddy.ai
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
