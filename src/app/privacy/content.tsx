"use client";

export function PrivacyContent() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-slate-700 dark:prose-li:text-gray-300">
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
          permesso.
        </p>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
          Cosa raccogliamo
        </h3>
        <p>Se accetti i cookie analytics, raccogliamo:</p>
        <ul>
          <li>
            <strong>Quanto è veloce l&apos;app</strong> - tempi di caricamento
            delle pagine
          </li>
          <li>
            <strong>Se la pagina &quot;salta&quot;</strong> - quando i contenuti
            si spostano mentre carichi
          </li>
          <li>
            <strong>Se risponde ai click</strong> - quanto tempo passa tra click
            e risposta
          </li>
          <li>
            <strong>Che dispositivo usi</strong> - telefono, tablet o computer
            (non il modello esatto)
          </li>
          <li>
            <strong>Che connessione hai</strong> - WiFi o dati mobili (non il
            tuo operatore)
          </li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
          Perché lo facciamo
        </h3>
        <ul>
          <li>Per capire se l&apos;app è lenta e dove</li>
          <li>
            Per aiutarti se ci scrivi &quot;l&apos;app non va&quot; - possiamo
            vedere cosa succede
          </li>
          <li>Per migliorare MirrorBuddy per tutti</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
          Cosa NON raccogliamo
        </h3>
        <ul>
          <li>Il tuo indirizzo IP completo</li>
          <li>Cosa scrivi nelle chat (quello è separato)</li>
          <li>Con chi parli o cosa studi</li>
        </ul>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
          Per quanto tempo
        </h3>
        <p>
          Teniamo questi dati per 90 giorni, poi li cancelliamo o li rendiamo
          anonimi (non più collegati a te).
        </p>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
          Puoi dire di no
        </h3>
        <p>
          Nelle impostazioni cookie puoi disattivare &quot;Analytics&quot; e
          smetteremo di raccogliere questi dati.
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
          <li>
            <strong>I provider AI</strong> - Azure OpenAI per le risposte dei
            Maestri
          </li>
        </ul>
        <p>
          Nessun altro. Non condividiamo con pubblicità, social network o altre
          aziende.
        </p>
      </Section>

      <Section number={7} title="Dove sono i tuoi dati">
        <p>
          I dati sono salvati su server in Europa (Azure EU West), nel rispetto
          del GDPR - le regole europee sulla privacy.
        </p>
      </Section>

      <Section number={8} title="Per quanto tempo li teniamo">
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

      <Section number={9} title="I tuoi diritti">
        <p>Puoi sempre:</p>
        <ul>
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

      <Section number={10} title="Cookie e Analytics">
        <p>Usiamo cookie di due tipi:</p>
        <ul>
          <li>
            <strong>Essenziali</strong> - per farti accedere (non puoi
            disattivarli)
          </li>
          <li>
            <strong>Analytics</strong> - per capire come migliora l&apos;app
            (puoi disattivarli)
          </li>
        </ul>
        <p>Niente cookie pubblicitari o di tracciamento. Mai.</p>
      </Section>

      <Section number={11} title="Se sei minorenne">
        <p>Se hai meno di 14 anni:</p>
        <ul>
          <li>I tuoi genitori devono darti il permesso di usare MirrorBuddy</li>
          <li>Devono leggere questa Privacy Policy</li>
          <li>Possono sempre vedere cosa fai e cancellare il tuo account</li>
        </ul>
        <p className="text-slate-600 dark:text-gray-400 italic">
          Consigliamo sempre di usare MirrorBuddy con un adulto vicino,
          soprattutto le prime volte.
        </p>
      </Section>

      <Section number={12} title="Sicurezza">
        <p>Per proteggere i tuoi dati:</p>
        <ul>
          <li>Connessione HTTPS crittografata</li>
          <li>Database protetto con password complesse</li>
          <li>Backup giornalieri</li>
          <li>Team ridotto con accesso ai dati</li>
        </ul>
        <p>Nessun sistema è perfetto al 100%, ma facciamo del nostro meglio.</p>
      </Section>

      <Section number={13} title="Modifiche a questa policy">
        <p>Se cambiamo questa Privacy Policy:</p>
        <ul>
          <li>Ti avviseremo via email</li>
          <li>Vedrai un banner in app</li>
          <li>Ti chiederemo di leggere di nuovo e accettare</li>
        </ul>
      </Section>

      <Section number={14} title="Domande">
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
