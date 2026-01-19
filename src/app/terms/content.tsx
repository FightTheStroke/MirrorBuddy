"use client";

export function TermsContent() {
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:text-slate-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-slate-700 dark:prose-li:text-gray-300">
      <Section number={1} title="Cos'è MirrorBuddy">
        <p>
          MirrorBuddy è un&apos;app gratuita che usa l&apos;intelligenza
          artificiale per aiutare bambini e ragazzi a studiare.
        </p>
        <p>
          È un progetto della Fondazione FightTheStroke, fatto da persone che
          vogliono rendere lo studio più accessibile a tutti.
        </p>
      </Section>

      <Section number={2} title="Cosa promettiamo">
        <ul>
          <li>Fare del nostro meglio per creare uno strumento utile</li>
          <li>Proteggere i tuoi dati (vedi Privacy Policy)</li>
          <li>Ascoltare i tuoi feedback e migliorare</li>
          <li>Essere trasparenti su come funziona</li>
        </ul>
      </Section>

      <Section number={3} title="Cosa NON possiamo promettere">
        <p>Siamo onesti: MirrorBuddy ha dei limiti.</p>
        <div className="pl-4 border-l-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
            Non siamo una scuola
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            MirrorBuddy aiuta a studiare, ma non sostituisce insegnanti e
            scuola.
          </p>
        </div>
        <div className="pl-4 border-l-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
            L&apos;AI può sbagliare
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            L&apos;intelligenza artificiale è brava ma non perfetta. Controlla
            sempre le risposte importanti con un adulto o un libro.
          </p>
        </div>
        <div className="pl-4 border-l-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
            È un servizio gratuito in beta
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            Facciamo del nostro meglio, ma il servizio potrebbe non funzionare
            sempre o cambiare.
          </p>
        </div>
      </Section>

      <Section number={4} title="I Professori AI">
        <p>
          MirrorBuddy include professori virtuali ispirati a figure storiche e
          contemporanee. Ecco cosa devi sapere:
        </p>
        <div className="pl-4 border-l-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Scopo puramente educativo
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            I professori AI sono creati esclusivamente per scopi educativi e di
            dimostrazione. Non rappresentano le persone reali e non sono
            affiliati o approvati da esse.
          </p>
        </div>
        <div className="pl-4 border-l-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            I professori possono cambiare
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            La lista dei professori disponibili potrebbe variare nel tempo.
            Alcuni potrebbero essere sostituiti o rimossi.
          </p>
        </div>
        <div className="pl-4 border-l-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-r-lg my-4">
          <p className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Versione dimostrativa
          </p>
          <p className="text-slate-700 dark:text-gray-300">
            Questa versione serve a dimostrare le potenzialita della
            piattaforma. In futuro, ogni studente potra creare i propri
            professori personalizzati, scegliendo liberamente nomi e avatar.
          </p>
        </div>
      </Section>

      <Section number={5} title="Se qualcosa va storto">
        <p>
          MirrorBuddy è gratuito e fatto con il cuore. Non possiamo essere
          responsabili se:
        </p>
        <ul>
          <li>L&apos;AI dà una risposta sbagliata</li>
          <li>Il servizio non funziona per un po&apos;</li>
          <li>Non passi un esame (studiare resta fondamentale!)</li>
          <li>Succede qualcosa mentre usi l&apos;app</li>
        </ul>
        <p className="text-slate-600 dark:text-gray-400 italic">
          Questo non significa che non ci importa - ci importa moltissimo! Ma
          legalmente dobbiamo proteggerci per poter continuare ad aiutare.
        </p>
      </Section>

      <Section number={6} title="Ti chiediamo di...">
        <p>Per far funzionare tutto bene, ti chiediamo di:</p>
        <ul>
          <li>
            <strong>Usare MirrorBuddy con rispetto</strong> - verso l&apos;app e
            verso gli altri
          </li>
          <li>
            <strong>Non provare a &quot;fregare&quot; l&apos;AI</strong> - non
            farle dire cose brutte o pericolose
          </li>
          <li>
            <strong>Segnalarci i problemi</strong> - se qualcosa non va,
            diccelo: info@fightthestroke.org
          </li>
          <li>
            <strong>Non condividere il tuo account</strong> - è personale
          </li>
        </ul>
      </Section>

      <Section number={7} title="Per i genitori e tutori">
        <p>Se tuo figlio ha meno di 14 anni:</p>
        <ul>
          <li>
            <strong>Sei tu il responsabile</strong> del suo utilizzo di
            MirrorBuddy
          </li>
          <li>
            <strong>Ti chiediamo di supervisionare</strong> - stai vicino mentre
            usa l&apos;app
          </li>
          <li>
            <strong>Controlla le conversazioni</strong> - puoi farlo quando vuoi
          </li>
          <li>
            <strong>Parlaci se hai dubbi</strong> - siamo genitori anche noi,
            capiamo
          </li>
        </ul>
      </Section>

      <Section number={8} title="I tuoi dati">
        <p>
          Trattiamo i tuoi dati con rispetto. Per tutti i dettagli, leggi la{" "}
          <a
            href="/privacy"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Privacy Policy completa
          </a>
          .
        </p>
        <p>In breve:</p>
        <ul>
          <li>Raccogliamo solo quello che serve</li>
          <li>Non vendiamo i tuoi dati a nessuno</li>
          <li>Puoi cancellare tutto quando vuoi</li>
          <li>I dati restano in Europa</li>
        </ul>
      </Section>

      <Section number={9} title="Possiamo bloccarti?">
        <p>Sì, ma solo se:</p>
        <ul>
          <li>Abusi del servizio</li>
          <li>Cerchi di danneggiare altri utenti</li>
          <li>Violi questi termini in modo grave</li>
        </ul>
        <p>
          Prima di bloccarti, proveremo a parlarti. Non siamo qui per punire,
          siamo qui per aiutare.
        </p>
      </Section>

      <Section number={10} title="Modifiche a questi termini">
        <p>Se cambiamo questi termini:</p>
        <ul>
          <li>Ti avviseremo</li>
          <li>Ti chiederemo di accettare di nuovo</li>
          <li>Non cambieremo le regole &quot;di nascosto&quot;</li>
        </ul>
      </Section>

      <Section number={11} title="Legge e tribunale">
        <p>Questi termini seguono la legge italiana.</p>
        <p>
          Se proprio non riusciamo a risolvere un problema parlando, il
          tribunale competente è quello di Milano.
        </p>
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
