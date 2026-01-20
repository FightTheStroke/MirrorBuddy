"use client";

import { Section } from "./section";

export function PrivacyContentAI() {
  return (
    <Section number={15} title="Trattamento mediante Intelligenza Artificiale">
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        Quali sistemi AI usiamo
      </h3>
      <p>
        MirrorBuddy utilizza <strong>Azure OpenAI</strong> per fornire risposte
        educative personalizzate attraverso i nostri Maestri AI. Questo è il
        nostro provider di intelligenza artificiale di fiducia, selezionato per
        la sua sicurezza e conformità GDPR.
      </p>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        Quali dati elabora l&apos;AI
      </h3>
      <p>Per darti risposte utili, il nostro sistema AI elabora:</p>
      <ul className="text-slate-700 dark:text-gray-300 space-y-2">
        <li>
          <strong>I tuoi messaggi e domande</strong> - quello che scrivi quando
          parli con un Maestro
        </li>
        <li>
          <strong>Il contesto della conversazione</strong> - cosa hai chiesto
          prima, per dare risposte coerenti
        </li>
        <li>
          <strong>Profilo educativo anonimo</strong> - materia, livello di
          difficoltà (non il tuo nome)
        </li>
      </ul>
      <p>
        <strong>Non elaboriamo con AI:</strong> dati sensibili sulla salute,
        immagini, video, informazioni personali sensibili.
      </p>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        Come funzionano le decisioni dell&apos;AI
      </h3>
      <p>
        L&apos;AI di MirrorBuddy <strong>genera contenuti educativi</strong>,
        non prende decisioni che ti riguardano legalmente. Noi non usiamo
        algoritmi automatici per:
      </p>
      <ul className="text-slate-700 dark:text-gray-300 space-y-2">
        <li>Accettare o rifiutare il tuo accesso</li>
        <li>Determinare benefici, obblighi o diritti legali</li>
        <li>
          Prendere decisioni su valutazioni o risultati educativi definitivi
        </li>
      </ul>
      <p className="text-slate-600 dark:text-gray-400 italic">
        Tutti i giudizi importanti sulla tua educazione sono sempre fatti da
        insegnanti e tutori umani, non da algoritmi.
      </p>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        I tuoi diritti su AI e automazione
      </h3>
      <p>Hai diritto a:</p>
      <ul className="text-slate-700 dark:text-gray-300 space-y-2">
        <li>
          <strong>Richiedere intervento umano</strong> - se una decisione AI ti
          interessa, puoi chiedere che una persona la riveda
        </li>
        <li>
          <strong>Esprimere il tuo parere</strong> - puoi dirci se una risposta
          dell&apos;AI non è utile
        </li>
        <li>
          <strong>Sapere quando parli con AI</strong> - è sempre chiaro che sei
          in chat con un Maestro AI, non una persona
        </li>
        <li>
          <strong>Opporti al trattamento</strong> - puoi chiedere di non usare
          Azure OpenAI per le tue risposte (useremo un modello fallback)
        </li>
      </ul>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        Trasparenza e sorveglianza umana
      </h3>
      <p>Per proteggere te e garantire qualità:</p>
      <ul className="text-slate-700 dark:text-gray-300 space-y-2">
        <li>
          <strong>Revisione umana</strong> - il nostro team rivede campioni di
          conversazioni per qualità e sicurezza
        </li>
        <li>
          <strong>Monitoraggio</strong> - controlliamo che l&apos;AI non generi
          contenuti inappropriati
        </li>
        <li>
          <strong>Segnalazioni</strong> - puoi segnalare risposte sbagliate
          direttamente nell&apos;app
        </li>
        <li>
          <strong>Limite dei dati</strong> - eliminiamo le conversazioni AI dopo
          30 giorni dalla richiesta
        </li>
      </ul>

      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-6 mb-3">
        Per saperne di più
      </h3>
      <p>
        Leggi la nostra{" "}
        <a
          href="/ai-policy"
          className="text-blue-600 hover:text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          AI Policy completa
        </a>{" "}
        per dettagli tecnici su come funziona il sistema e come proteggiamo i
        tuoi dati durante il trattamento AI.
      </p>
    </Section>
  );
}
