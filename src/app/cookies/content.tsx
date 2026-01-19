"use client";

export function CookiesContent() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-slate-700 dark:prose-li:text-gray-300">
      <Section number={1} title="Cosa sono i cookie">
        <p>
          I cookie sono piccoli file di testo che i siti web salvano sul tuo
          dispositivo (computer, telefono, tablet). Servono a ricordare
          informazioni utili, come se hai già effettuato l&apos;accesso.
        </p>
        <p>
          Immagina i cookie come dei post-it che il sito lascia sul tuo browser
          per ricordarsi di te.
        </p>
      </Section>

      <Section number={2} title="Quali cookie usiamo">
        <p>MirrorBuddy usa solo due tipi di cookie:</p>
        <ul>
          <li>
            <strong>Cookie essenziali</strong> - servono per far funzionare
            l&apos;app
          </li>
          <li>
            <strong>Cookie analytics</strong> - servono a capire se l&apos;app
            funziona bene
          </li>
        </ul>
        <p className="text-slate-600 dark:text-gray-400 italic">
          Non usiamo MAI cookie pubblicitari. Mai. Non abbiamo pubblicità.
        </p>
      </Section>

      <Section number={3} title="Cookie essenziali">
        <p>
          Questi cookie sono necessari per usare MirrorBuddy. Non puoi
          disattivarli perché senza di loro l&apos;app non funzionerebbe.
        </p>
        <CookieTable
          cookies={[
            {
              name: "session",
              purpose: "Ricorda che hai fatto il login",
              duration: "Fino al logout",
            },
            {
              name: "csrf_token",
              purpose: "Protegge il tuo account da attacchi",
              duration: "Fino alla chiusura del browser",
            },
            {
              name: "tos_accepted",
              purpose: "Ricorda che hai accettato i Termini",
              duration: "1 anno",
            },
            {
              name: "consent_preferences",
              purpose: "Salva le tue scelte sui cookie",
              duration: "1 anno",
            },
            {
              name: "mirrorbuddy-a11y",
              purpose:
                "Preferenze di accessibilità (font, contrasto, movimento)",
              duration: "90 giorni",
            },
          ]}
        />
      </Section>

      <Section number={4} title="Cookie analytics">
        <p>
          Questi cookie ci aiutano a capire se MirrorBuddy funziona bene sul tuo
          dispositivo. Li usiamo solo se ci dai il permesso.
        </p>
        <CookieTable
          cookies={[
            {
              name: "analytics_consent",
              purpose: "Ricorda se hai accettato gli analytics",
              duration: "1 anno",
            },
            {
              name: "session_id",
              purpose: "Collega le metriche di una sessione",
              duration: "Fino alla chiusura del browser",
            },
          ]}
        />

        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
          Cosa misurano gli analytics
        </h3>
        <p>Se accetti i cookie analytics, raccogliamo:</p>
        <ul>
          <li>
            <strong>Web Vitals</strong> - metriche tecniche sulla velocità
            dell&apos;app
          </li>
          <li>
            <strong>Tipo di dispositivo</strong> - telefono, tablet o computer
          </li>
          <li>
            <strong>Tipo di connessione</strong> - WiFi o dati mobili
          </li>
          <li>
            <strong>Pagine lente</strong> - per capire dove migliorare
          </li>
        </ul>
        <p>
          Per maggiori dettagli, leggi la sezione &quot;Metriche di
          Performance&quot; nella{" "}
          <a
            href="/privacy"
            className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            Privacy Policy
          </a>
          .
        </p>
      </Section>

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

      <Section number={6} title="Cookie di terze parti">
        <p>MirrorBuddy non usa cookie di terze parti per pubblicità.</p>
        <p>
          I nostri servizi tecnici (hosting, database) non installano cookie sul
          tuo dispositivo.
        </p>
      </Section>

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
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  const headingId = `section-${number}`;
  return (
    <section className="mb-8" aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-baseline gap-3"
      >
        <span className="text-blue-600 dark:text-blue-400" aria-hidden="true">
          {number}.
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface CookieInfo {
  name: string;
  purpose: string;
  duration: string;
}

function CookieTable({ cookies }: { cookies: CookieInfo[] }) {
  return (
    <div className="overflow-x-auto my-4">
      <table
        className="min-w-full border-collapse"
        role="table"
        aria-label="Elenco cookie"
      >
        <thead>
          <tr className="bg-slate-100 dark:bg-gray-700">
            <th
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-gray-600"
            >
              Nome
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-gray-600"
            >
              A cosa serve
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white border border-slate-200 dark:border-gray-600"
            >
              Quanto dura
            </th>
          </tr>
        </thead>
        <tbody>
          {cookies.map((cookie) => (
            <tr
              key={cookie.name}
              className="hover:bg-slate-50 dark:hover:bg-gray-700/50"
            >
              <td className="px-4 py-3 text-sm font-mono text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-600">
                {cookie.name}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-600">
                {cookie.purpose}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-600">
                {cookie.duration}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
