"use client";

import { Section } from "../sections";

export function FAQSupportSections() {
  return (
    <>
      <Section number={9} title="Segnalare Problemi">
        <p>
          Se hai preoccupazioni su come MirrorBuddy usa l&apos;IA, contattaci:
        </p>
        <ul className="space-y-2">
          <li>
            <strong>Email</strong>:{" "}
            <a
              href="mailto:compliance@mirrorbuddy.it"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              compliance@mirrorbuddy.it
            </a>
          </li>
          <li>
            <strong>Modulo Online</strong>: Disponibile nel dashboard account
          </li>
          <li>
            <strong>Autorità di Vigilanza</strong>: Puoi anche contattare
            direttamente il Garante della Privacy (www.garanteprivacy.it)
          </li>
        </ul>
        <p className="mt-4">
          Rispondiamo a tutti i reclami entro 30 giorni lavorativi.
        </p>
      </Section>

      <Section number={10} title="Domande Frequenti">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          L&apos;IA legge le mie chat con i miei amici?
        </h3>
        <p>
          No. L&apos;IA vede solo le chat che avvengono all&apos;interno di
          MirrorBuddy quando parli con i Maestri. Le tue conversazioni private
          fuori da MirrorBuddy rimangono private.
        </p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          Posso cancellare le mie chat con i Maestri?
        </h3>
        <p>
          Sì. Puoi cancellare singole chat dal tuo dashboard. Se vuoi cancellare
          tutto, puoi richiedere il &quot;diritto all&apos;oblio&quot; tramite
          l&apos;indirizzo email di compliance.
        </p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          L&apos;IA conosce le mie diagnosi (DSA, ADHD, ecc.)?
        </h3>
        <p>
          Solo se li hai scelto di condividere nel profilo. MirrorBuddy non
          raccoglie diagnosi mediche automaticamente, ma i Maestri possono
          personalizzare l&apos;insegnamento se sai i tuoi bisogni di
          apprendimento.
        </p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          Cosa succede se l&apos;IA fa un errore?
        </h3>
        <p>
          Segnalalo al tuo insegnante, che può marcare la risposta come
          inesatta. Questo aiuta a migliorare il Maestro. Inoltre, gli
          insegnanti possono sempre correggere o integrare la spiegazione
          dell&apos;IA.
        </p>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          Come posso rifiutare di usare l&apos;IA?
        </h3>
        <p>
          Vai nelle impostazioni account e disattiva &quot;Usa i Maestri
          IA&quot;. Avrai comunque accesso a tutti gli altri strumenti di
          MirrorBuddy (risorse, appunti, ecc.), e potrai parlare direttamente
          con i tuoi insegnanti.
        </p>
      </Section>

      <Section title="Ultimi Aggiornamenti">
        <p>
          Questa pagina è aggiornata con le ultime informazioni sulla conformità
          IA. Controlli periodicamente per eventuali cambiamenti nei sistemi
          utilizzati o nella normativa.
        </p>
        <p className="mt-4 text-sm text-slate-600 dark:text-gray-400">
          <strong>Prossima revisione prevista:</strong> 20 Gennaio 2027
        </p>
      </Section>
    </>
  );
}
