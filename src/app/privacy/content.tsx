"use client";

import { Section } from "./section";

export function PrivacyContent() {
  return (
    <>
      <Section number={1} title="Chi siamo">
        <p>
          MirrorBuddy è un progetto della Fondazione FightTheStroke,
          un&apos;organizzazione non-profit che lavora per rendere
          l&apos;educazione accessibile a tutti i bambini e ragazzi, in
          particolare quelli con difficoltà di apprendimento.
        </p>
      </Section>

      <Section number={2} title="Che dati raccogliamo">
        <p>Per farti usare MirrorBuddy, raccogliamo:</p>
        <ul>
          <li>
            <strong>Email</strong> - per accedere e recuperare la password
          </li>
          <li>
            <strong>Nome o nickname</strong> - così i Maestri possono chiamarti
          </li>
          <li>
            <strong>Le tue conversazioni</strong> - per farti ritrovare le chat
            e migliorare l&apos;AI
          </li>
          <li>
            <strong>Flashcard e quiz</strong> - per ricordarti cosa hai studiato
          </li>
          <li>
            <strong>Progressi</strong> - livelli, badge, streak (solo se usi la
            gamification)
          </li>
          <li>
            <strong>Impostazioni</strong> - tema, accessibilità, lingua
          </li>
        </ul>
      </Section>

      <Section number={3} title="Cosa NON raccogliamo">
        <p>Non raccogliamo:</p>
        <ul>
          <li>Dati sensibili sulla salute (diagnosi, certificazioni DSA)</li>
          <li>Informazioni sui pagamenti (l&apos;app è gratuita)</li>
          <li>Foto o video (tranne l&apos;avatar che scegli tu)</li>
          <li>Localizzazione GPS</li>
        </ul>
      </Section>

      <Section number={4} title="Perché raccogliamo questi dati">
        <p>Usiamo i tuoi dati per:</p>
        <ul>
          <li>
            <strong>Far funzionare l&apos;app</strong> - senza email non puoi
            accedere
          </li>
          <li>
            <strong>Personalizzare l&apos;esperienza</strong> - ricordare cosa
            hai studiato
          </li>
          <li>
            <strong>Migliorare MirrorBuddy</strong> - capire cosa funziona e
            cosa no
          </li>
          <li>
            <strong>Aiutarti se hai problemi</strong> - se ci scrivi
            &quot;l&apos;app non va&quot;
          </li>
        </ul>
        <p className="text-slate-600 dark:text-gray-400 italic">
          Non vendiamo MAI i tuoi dati. Mai. Siamo una fondazione non-profit,
          non una società pubblicitaria.
        </p>
      </Section>

      <Section number={5} title="Metriche di Performance (Web Vitals)">
        <p>
          Per capire se MirrorBuddy funziona bene sul tuo dispositivo,
          raccogliamo alcune informazioni tecniche - ma solo se ci dai il
          permesso (cookie analytics).
        </p>
        <p className="mt-2">
          <strong>Raccogliamo:</strong> Tempi di caricamento, stabilità pagina,
          risposta ai click, tipo dispositivo, tipo connessione (no IP completo,
          no contenuti chat).
        </p>
        <p className="mt-2">
          <strong>Perché:</strong> Capire se l&apos;app è lenta, aiutarti in
          caso di problemi, migliorare per tutti.
        </p>
        <p className="mt-2">
          <strong>Retention:</strong> 90 giorni, poi anonimizzati.
        </p>
        <p className="mt-2">
          <strong>Opt-out:</strong> Disattiva &quot;Analytics&quot; nelle
          impostazioni cookie.
        </p>
      </Section>

      <Section number={6} title="Chi vede i tuoi dati">
        <p>I tuoi dati possono essere visti da:</p>
        <ul>
          <li>
            <strong>Tu</strong> - sempre, quando vuoi
          </li>
          <li>
            <strong>I tuoi genitori</strong> - se sei minorenne e loro hanno
            accesso
          </li>
          <li>
            <strong>Il nostro team</strong> - solo per supporto tecnico, in
            forma anonima
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
          Fornitori di Servizi Terzi (Responsabili del Trattamento)
        </h3>
        <p className="text-sm">
          Ai sensi dell&apos;Articolo 28 GDPR, utilizziamo i seguenti fornitori
          terzi con accordi di trattamento dati (Data Processing Agreement - DPA)
          vincolanti:
        </p>

        <ul className="space-y-1 mt-3 text-xs list-disc list-inside">
          <li>
            <strong>Vercel Inc.</strong> - Hosting web | Dati: Log, cookie sessione | Luogo: USA | Base: Art. 6(1)(b) GDPR | SCC Modulo 2
          </li>
          <li>
            <strong>Supabase Inc.</strong> - Database | Dati: Profili, conversazioni, preferenze | Luogo: UE (Francoforte) | Base: Art. 6(1)(b) GDPR
          </li>
          <li>
            <strong>Microsoft Azure OpenAI</strong> - AI conversazionale | Dati: Chat, audio, trascrizioni | Luogo: UE (West Europe, Sweden) | Base: Art. 6(1)(b) GDPR
          </li>
          <li>
            <strong>Resend</strong> - Email | Dati: Indirizzi email, credenziali temporanee | Luogo: USA | Base: Art. 6(1)(b) GDPR | SCC Modulo 2
          </li>
          <li>
            <strong>Upstash Inc.</strong> - Rate limiting | Dati: Hash ID (anonimo), contatori | Luogo: Multi-regione | Base: Art. 6(1)(f) GDPR | SCC
          </li>
          <li>
            <strong>Brave Search</strong> - Ricerca web | Dati: Query anonime (no PII) | Luogo: USA | Base: Art. 6(1)(f) GDPR
          </li>
          <li>
            <strong>Google LLC</strong> - OAuth Drive | Dati: Token OAuth, metadata file | Luogo: USA | Base: Art. 6(1)(a) GDPR (consenso)
          </li>
          <li>
            <strong>Grafana Labs</strong> - Monitoring | Dati: Metriche (no PII) | Luogo: UE/USA | Base: Art. 6(1)(f) GDPR
          </li>
          <li>
            <strong>Ollama</strong> - AI locale | Dati: Messaggi (locale) | Luogo: localhost | Base: Art. 6(1)(b) GDPR | No trasferimenti
          </li>
        </ul>

        <p className="mt-4 font-medium">
          Nessun altro ha accesso ai tuoi dati. Non condividiamo con pubblicità,
          social network o altre aziende commerciali.
        </p>

        <p className="text-xs text-slate-600 dark:text-gray-400 mt-3">
          Tutti i fornitori extra-UE sono vincolati da Standard Contractual Clauses
          (SCC) approvate dalla Commissione Europea (Decisione UE 2021/914) e
          misure supplementari di sicurezza (TLS 1.3, AES-256, audit logs) in
          conformità con Schrems II (CJEU C-311/18).
        </p>
      </Section>

      <Section number={7} title="Dove sono i tuoi dati">
        <p>
          I dati primari (account, conversazioni, preferenze) sono archiviati
          esclusivamente in Europa tramite Supabase (Francoforte, Germania) e
          Azure OpenAI (West Europe/Sweden Central), nel rispetto del GDPR.
        </p>
        <p className="mt-2">
          Per trasferimenti extra-UE necessari (hosting Vercel, email Resend)
          utilizziamo Standard Contractual Clauses (SCC) approvate dalla
          Commissione Europea e misure supplementari di sicurezza (crittografia
          TLS 1.3, AES-256, controlli accesso, audit logs).
        </p>
        <p className="text-sm text-slate-600 dark:text-gray-400 mt-3">
          Base legale: GDPR (Reg. UE 2016/679) Articoli 44-50 (Capitolo V -
          Trasferimenti internazionali), conformità Schrems II (C-311/18).
          Documento completo: <code>docs/compliance/DATA-FLOW-MAPPING.md</code>
        </p>
      </Section>

      <Section number={8} title="Sub-responsabili del Trattamento">
        <p>
          I nostri fornitori principali utilizzano sub-responsabili del trattamento (sub-processors) per erogare i servizi. In conformità con l&apos;Art. 28 GDPR, tutti i sub-responsabili sono vincolati da Data Processing Agreements (DPA) e Standard Contractual Clauses (SCC) dove applicabile.
        </p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          Sub-responsabili per fornitore
        </h3>
        <ul className="text-slate-700 dark:text-gray-300 space-y-1 text-sm">
          <li><strong>Vercel</strong>: AWS, Google Cloud, Cloudflare, Datadog, Sentry</li>
          <li><strong>Supabase</strong>: AWS Frankfurt, Fly.io (EU), Cloudflare, SendGrid</li>
          <li><strong>Resend</strong>: AWS US, Cloudflare, Vercel, Sentry</li>
          <li><strong>Azure</strong>: Microsoft Corp, Equinix/Digital Realty (NL), OpenAI LLC (no accesso dati)</li>
        </ul>

        <p className="text-sm text-slate-600 dark:text-gray-400 mt-3">
          Gli obblighi GDPR Art. 28 includono: limitazione delle finalità, notifica violazioni entro 72h, diritto alla cancellazione dati, permessi di audit, preavviso 30 giorni per modifiche sub-responsabili.
        </p>
      </Section>

      <Section number={9} title="Per quanto tempo li teniamo">
        <ul>
          <li>
            <strong>Account attivo</strong> - finché usi MirrorBuddy
          </li>
          <li>
            <strong>Conversazioni</strong> - fino a quando le cancelli tu
          </li>
          <li>
            <strong>Web Vitals</strong> - 90 giorni, poi anonimizzati
          </li>
          <li>
            <strong>Account cancellato</strong> - 30 giorni poi tutto viene
            eliminato
          </li>
        </ul>
      </Section>
    </>
  );
}
