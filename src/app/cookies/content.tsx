"use client";

import { Section, CookieTable } from "./components";
import {
  ManagementSection,
  ThirdPartySection,
  DurationSection,
  ChangesSection,
  LinksSection,
} from "./sections";

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
              name: "mirrorbuddy-user-id",
              purpose:
                "Autenticazione: ricorda chi sei (firmato crittograficamente, httpOnly)",
              duration: "1 anno",
            },
            {
              name: "mirrorbuddy-user-id-client",
              purpose:
                "Copia leggibile del tuo ID per funzioni lato client (senza dati sensibili)",
              duration: "1 anno",
            },
            {
              name: "mirrorbuddy-a11y",
              purpose:
                "Preferenze di accessibilità (font, contrasto, movimento)",
              duration: "90 giorni",
            },
            {
              name: "mirrorbuddy-admin",
              purpose: "Indica sessione amministratore (solo per staff)",
              duration: "Fino al logout",
            },
          ]}
        />
        <p className="text-sm text-slate-600 dark:text-gray-400 mt-3">
          <strong>Nota tecnica:</strong> Il cookie di autenticazione usa firma
          HMAC-SHA256 per impedire manomissioni. La flag httpOnly protegge da
          accessi non autorizzati via JavaScript.
        </p>
      </Section>

      <Section number={4} title="Metriche e analytics">
        <p>
          MirrorBuddy non usa cookie analytics di terze parti. Le tue preferenze
          sui cookie sono salvate nel browser (localStorage), non in un cookie.
        </p>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
          Come raccogliamo le metriche
        </h3>
        <p>
          Raccogliamo metriche tecniche (Web Vitals) per capire se l&apos;app
          funziona bene. Queste metriche sono:
        </p>
        <ul>
          <li>
            <strong>Raccolte lato server</strong> - nessun cookie analytics
            installato sul tuo browser
          </li>
          <li>
            <strong>Aggregate e anonime</strong> - non ti identifichiamo
            personalmente
          </li>
          <li>
            <strong>Solo tecniche</strong> - velocità di caricamento, tipo di
            dispositivo, errori
          </li>
          <li>
            <strong>GDPR compliant</strong> - dati trattati secondo Privacy
            Policy
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

      <ManagementSection />
      <ThirdPartySection />
      <DurationSection />
      <ChangesSection />
      <LinksSection />
    </div>
  );
}
