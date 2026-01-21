"use client";

import { Section } from "./components";

/**
 * Cookie Policy - Management and Duration sections
 */

export function ManagementSection() {
  return (
    <Section number={5} title="Come gestire i cookie">
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-4 mb-3">
        Nelle impostazioni di MirrorBuddy
      </h3>
      <p>
        Puoi gestire i cookie analytics direttamente dall&apos;app. Vai nelle
        impostazioni e cerca la sezione &quot;Privacy e Cookie&quot;.
      </p>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        Dal tuo browser
      </h3>
      <p>
        Puoi anche gestire i cookie dalle impostazioni del tuo browser. Ecco
        come fare nei browser più comuni:
      </p>
      <ul>
        <li>
          <strong>Chrome</strong> - Impostazioni → Privacy e sicurezza →
          Cookie
        </li>
        <li>
          <strong>Firefox</strong> - Impostazioni → Privacy → Cookie
        </li>
        <li>
          <strong>Safari</strong> - Preferenze → Privacy → Gestisci dati siti
          web
        </li>
        <li>
          <strong>Edge</strong> - Impostazioni → Cookie e autorizzazioni sito
        </li>
      </ul>

      <div
        role="note"
        aria-label="Nota importante sui cookie"
        className="pl-4 border-l-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-r-lg my-4"
      >
        <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
          Attenzione
        </p>
        <p className="text-slate-700 dark:text-gray-300">
          Se blocchi tutti i cookie, MirrorBuddy potrebbe non funzionare
          correttamente. Ti consigliamo di permettere almeno i cookie
          essenziali.
        </p>
      </div>
    </Section>
  );
}

export function ThirdPartySection() {
  return (
    <Section number={6} title="Cookie di terze parti e sub-responsabili">
      <p>
        MirrorBuddy <strong>non usa cookie di terze parti</strong> per
        pubblicità o tracciamento.
      </p>
      <p>
        I nostri fornitori di servizi tecnici (sub-responsabili del
        trattamento) <strong>non installano cookie sul tuo dispositivo</strong>
        :
      </p>
      <ul>
        <li>
          <strong>Vercel</strong> - hosting dell&apos;applicazione (nessun
          cookie, no analytics installato)
        </li>
        <li>
          <strong>Supabase</strong> - database PostgreSQL (comunicazione
          server-side, no cookie)
        </li>
        <li>
          <strong>Azure OpenAI</strong> - intelligenza artificiale (API
          backend, no cookie)
        </li>
        <li>
          <strong>Resend</strong> - invio email (servizio backend, no cookie)
        </li>
        <li>
          <strong>Upstash</strong> - cache Redis (servizio backend, no cookie)
        </li>
      </ul>
      <p className="text-sm text-slate-600 dark:text-gray-400 mt-3">
        <strong>Google Drive (opzionale):</strong> Se connetti il tuo account
        Google per salvare documenti, Google può impostare i propri cookie
        durante il processo di autenticazione OAuth. I token di accesso sono
        crittografati e salvati nel nostro database, non nei cookie del
        browser.
      </p>
      <p>
        Per l&apos;elenco completo dei sub-responsabili, consulta la{" "}
        <a
          href="/privacy"
          className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          Privacy Policy
        </a>
        .
      </p>
    </Section>
  );
}

export function DurationSection() {
  return (
    <Section number={7} title="Per quanto tempo restano">
      <p>I cookie hanno durate diverse:</p>
      <ul>
        <li>
          <strong>Cookie di sessione</strong> - spariscono quando chiudi il
          browser
        </li>
        <li>
          <strong>Cookie persistenti</strong> - restano fino alla scadenza
          (max 1 anno)
        </li>
      </ul>
      <p>
        Puoi cancellare tutti i cookie in qualsiasi momento dalle impostazioni
        del tuo browser.
      </p>
    </Section>
  );
}

export function ChangesSection() {
  return (
    <Section number={8} title="Modifiche a questa policy">
      <p>Se cambiamo questa Cookie Policy:</p>
      <ul>
        <li>Aggiorneremo questa pagina</li>
        <li>Cambieremo la data di &quot;Ultimo aggiornamento&quot;</li>
        <li>
          Se le modifiche sono importanti, ti chiederemo di accettare di nuovo
        </li>
      </ul>
    </Section>
  );
}

export function LinksSection() {
  return (
    <Section number={9} title="Link utili">
      <p>Per saperne di più:</p>
      <ul>
        <li>
          <a
            href="/privacy"
            className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            Privacy Policy
          </a>{" "}
          - come trattiamo i tuoi dati
        </li>
        <li>
          <a
            href="/terms"
            className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            Termini di Servizio
          </a>{" "}
          - le regole di MirrorBuddy
        </li>
      </ul>
    </Section>
  );
}
