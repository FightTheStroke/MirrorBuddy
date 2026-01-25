"use client";

import { Section } from "./section";

export function PrivacyContentExtended() {
  return (
    <>
      <Section number={10} title="I tuoi diritti">
        <p>Puoi sempre:</p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>
            <strong>Vedere i tuoi dati</strong> - scarica tutto in formato JSON
          </li>
          <li>
            <strong>Correggere i dati</strong> - cambia nome, email,
            impostazioni
          </li>
          <li>
            <strong>Cancellare tutto</strong> - account e dati, via email a
            info@fightthestroke.org
          </li>
          <li>
            <strong>Esportare i dati</strong> - prendi una copia di tutto
          </li>
          <li>
            <strong>Opporti al trattamento</strong> - puoi dire &quot;non voglio
            che usiate i miei dati così&quot;
          </li>
        </ul>
        <p>
          Per esercitare questi diritti, scrivi a:{" "}
          <a
            href="mailto:info@fightthestroke.org"
            className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            info@fightthestroke.org
          </a>
        </p>
      </Section>

      <Section number={11} title="Cookie e Analytics">
        <p>Usiamo cookie di due tipi:</p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>
            <strong>Essenziali</strong> - per farti accedere (non puoi
            disattivarli)
          </li>
          <li>
            <strong>Analytics</strong> - per capire come migliora l&apos;app
            (puoi disattivarli)
          </li>
        </ul>
        <p className="mt-4">
          <strong>Vercel Analytics:</strong> Utilizziamo Vercel Analytics per
          monitorare le prestazioni del sito. Questo servizio:
        </p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>
            <strong>Non usa cookie</strong> - nessun tracciamento tra sessioni
          </li>
          <li>
            <strong>Dati aggregati e anonimi</strong> - non identifichiamo i
            singoli utenti
          </li>
          <li>
            <strong>Conforme GDPR</strong> - i dati restano in Europa
          </li>
          <li>
            <strong>Solo metriche tecniche</strong> - pagine visitate, tempi di
            caricamento, dispositivo (tipo, non identificativo)
          </li>
        </ul>
        <p className="mt-4">
          <strong>Sentry (Monitoraggio Errori e Performance):</strong>{" "}
          Utilizziamo Sentry per monitorare errori tecnici e performance
          dell&apos;applicazione. Questo servizio:
        </p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>
            <strong>Cattura errori tecnici</strong> - stack trace, browser,
            pagina dove è avvenuto l&apos;errore
          </li>
          <li>
            <strong>Performance tracing</strong> - tempi di risposta delle API,
            latenza delle richieste (dati tecnici aggregati)
          </li>
          <li>
            <strong>AI monitoring</strong> - metriche tecniche delle chiamate AI
            (numero di token, latenza, modello usato) - nessun contenuto delle
            conversazioni
          </li>
          <li>
            <strong>Session Replay (solo su errore)</strong> - se si verifica un
            errore, registra una replica anonimizzata della sessione (tutto il
            testo mascherato, media bloccati)
          </li>
          <li>
            <strong>Nessun dato personale identificativo</strong> - non
            raccoglie email, nomi, o contenuti delle tue conversazioni
          </li>
          <li>
            <strong>Server in Europa</strong> - i dati restano nell&apos;UE
            (datacenter EU)
          </li>
          <li>
            <strong>Solo per migliorare l&apos;app</strong> - ci aiuta a trovare
            e risolvere bug velocemente
          </li>
        </ul>
        <p>Niente cookie pubblicitari o di tracciamento. Mai.</p>
      </Section>

      <Section number={12} title="Se sei minorenne">
        <p>Se hai meno di 14 anni:</p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>I tuoi genitori devono darti il permesso di usare MirrorBuddy</li>
          <li>Devono leggere questa Privacy Policy</li>
          <li>Possono sempre vedere cosa fai e cancellare il tuo account</li>
        </ul>
        <p className="text-slate-600 dark:text-gray-400 italic">
          Consigliamo sempre di usare MirrorBuddy con un adulto vicino,
          soprattutto le prime volte.
        </p>
      </Section>

      <Section number={13} title="Sicurezza">
        <p>Per proteggere i tuoi dati:</p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>Connessione HTTPS crittografata</li>
          <li>Database protetto con password complesse</li>
          <li>Backup giornalieri</li>
          <li>Team ridotto con accesso ai dati</li>
        </ul>
        <p>Nessun sistema è perfetto al 100%, ma facciamo del nostro meglio.</p>
      </Section>

      <Section number={14} title="Modifiche a questa policy">
        <p>Se cambiamo questa Privacy Policy:</p>
        <ul className="text-slate-700 dark:text-gray-300 space-y-2">
          <li>Ti avviseremo via email</li>
          <li>Vedrai un banner in app</li>
          <li>Ti chiederemo di leggere di nuovo e accettare</li>
        </ul>
      </Section>

      <Section number={15} title="Domande">
        <p>
          Non hai capito qualcosa? Vuoi saperne di più? Scrivi a:{" "}
          <a
            href="mailto:info@fightthestroke.org"
            className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            info@fightthestroke.org
          </a>
        </p>
        <p>Siamo umani, parliamo italiano, e rispondiamo sempre.</p>
      </Section>
    </>
  );
}
