import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politica sui Cookie",
  description:
    "Scopri come utilizziamo i cookie e come gestire le tue preferenze",
  robots: "noindex, follow",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Politica sui Cookie
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Ultimo aggiornamento: Gennaio 2026
        </p>

        {/* Cosa sono i cookie */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Cosa sono i cookie?
          </h2>
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            I cookie sono piccoli file di testo memorizzati sul tuo dispositivo
            quando visiti il nostro sito. Ci aiutano a ricordare le tue
            preferenze, mantenere la sessione autenticata e migliorare
            l&apos;esperienza di utilizzo. Tutti i cookie che utilizziamo sono
            completamente sicuri e conformi alla normativa sulla privacy.
          </p>
        </section>

        {/* Cookie che utilizziamo */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Cookie che utilizziamo
          </h2>
          <ul className="space-y-4 text-slate-700 dark:text-slate-300">
            <li>
              <strong>mirrorbuddy-user-id:</strong> Mantiene la tua sessione di
              autenticazione per accedere in modo sicuro alla piattaforma.
            </li>
            <li>
              <strong>mirrorbuddy-visitor-id:</strong> Identifica i visitatori
              durante il periodo di prova, permettendoti di testare le
              funzionalità senza account.
            </li>
            <li>
              <strong>mirrorbuddy-consent:</strong> Salva le tue preferenze
              relative ai cookie e al consenso al trattamento dei dati.
            </li>
          </ul>
        </section>

        {/* Cookie di terze parti */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Cookie di terze parti
          </h2>
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            Utilizziamo Vercel Analytics per analizzare come gli utenti
            interagiscono con il nostro servizio, al fine di migliorare
            continuamente l&apos;esperienza. Non utilizziamo alcun cookie
            pubblicitario o di tracciamento intrusivo.
          </p>
        </section>

        {/* Gestire i cookie */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Come gestire i cookie
          </h2>
          <p className="text-slate-700 dark:text-slate-300 mb-4">
            Puoi controllare i cookie dal tuo browser:
          </p>
          <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2">
            <li>
              <strong>Chrome:</strong> Impostazioni → Privacy e sicurezza →
              Cookie e altri dati dei siti
            </li>
            <li>
              <strong>Firefox:</strong> Preferenze → Privacy e sicurezza →
              Cookie e dati dei siti
            </li>
            <li>
              <strong>Safari:</strong> Preferenze → Privacy → Gestisci dati per
              siti web
            </li>
            <li>
              <strong>Edge:</strong> Impostazioni → Privacy, ricerca e servizi →
              Cookie e altri dati
            </li>
          </ul>
        </section>

        {/* Contatti */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Domande sui cookie?
          </h2>
          <p className="text-slate-700 dark:text-slate-300">
            Se hai dubbi sulla nostra politica sui cookie, contattaci attraverso
            il nostro modulo di supporto o invia un&apos;email al nostro team di
            privacy.
          </p>
        </section>

        {/* Link di ritorno */}
        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-200 dark:border-slate-700">
          <Link
            href="/privacy"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            ← Leggi la Politica sulla Privacy
          </Link>
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Torna alla home →
          </Link>
        </div>
      </div>
    </div>
  );
}
