"use client";

import { Section } from "../sections";

export function AISystemSections() {
  return (
    <>
      <Section number={1} title="Cosa fa l'IA in MirrorBuddy?">
        <p>
          MirrorBuddy utilizza l&apos;intelligenza artificiale (IA) per offrire
          un&apos;esperienza educativa personalizzata. I 22{" "}
          <strong>Maestri IA</strong> (tutori virtuali) sono progettati per
          insegnare, spiegare concetti difficili, creare quiz, mappe mentali e
          flashcard.
        </p>
        <p>
          Importante: <strong>L&apos;IA NON decide il tuo voto</strong>,{" "}
          <strong>NON valuta la tua disabilità</strong>, e{" "}
          <strong>NON sostituisce i tuoi insegnanti</strong>. Gli insegnanti
          rimangono sempre i responsabili principali della valutazione e delle
          decisioni pedagogiche.
        </p>
      </Section>

      <Section number={2} title="Il Sistema IA">
        <p>
          MirrorBuddy utilizza <strong>Azure OpenAI (GPT-4)</strong>, un modello
          di linguaggio di ultima generazione sviluppato da OpenAI e ospitato
          nei data center europei di Microsoft.
        </p>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          Come Funziona:
        </h3>
        <ul className="space-y-2">
          <li>
            <strong>Elaborazione del Testo</strong>: Quando scrivi una domanda,
            il modello analizza il testo e genera una risposta basata sul suo
            addestramento
          </li>
          <li>
            <strong>Conoscenza Verificata</strong>: I 22 Maestri hanno{" "}
            <strong>embedded knowledge bases</strong> - librerie di conoscenza
            controllate e verificate da esperti - che limitano cosa possono dire
          </li>
          <li>
            <strong>Feedback Umano</strong>: Ogni risposta è revisionabile da
            insegnanti e genitori tramite il dashboard di controllo
          </li>
        </ul>
      </Section>

      <Section number={3} title="I 22 Maestri IA">
        <p>
          MirrorBuddy ha 22 tutori virtuali specializzati in diverse materie.
          Ogni Maestro ha una personalità autentica e una conoscenza verificata
          nel suo ambito.
        </p>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          Categorie di Maestri:
        </h3>
        <ul className="space-y-2">
          <li>
            <strong>Scienze e Matematica</strong>: Euclide (Geometria), Galileo
            (Astronomia), Feynman (Fisica), Curie (Chimica), Darwin (Biologia)
          </li>
          <li>
            <strong>Lingue e Umanistica</strong>: Manzoni (Italiano),
            Shakespeare (Inglese), Alex Pina (Spagnolo), Omero (Storytelling)
          </li>
          <li>
            <strong>Società e Ambiente</strong>: Cicerone (Educazione Civica),
            Smith (Economia), Humboldt (Geografia), Erodoto (Storia)
          </li>
          <li>
            <strong>Arte, Musica e Benessere</strong>: Leonardo (Arte), Mozart
            (Musica), Ippocrate (Salute), Chris (Educazione Fisica), Simone
            (Sport)
          </li>
          <li>
            <strong>Discipline Specialistiche</strong>: Lovelace (Informatica),
            Socrate (Filosofia), Cassese (Diritto Internazionale)
          </li>
        </ul>
        <p className="mt-4">
          Ogni Maestro ha una voce unica (sia testuale che audio), uno stile
          didattico personalizzato, e può accedere a strumenti come quiz,
          flashcard, mappe mentali e PDF per insegnare efficacemente.
        </p>
      </Section>

      <Section number={4} title="Le Tue Protezioni">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          Sistema di Sicurezza a 5 Livelli:
        </h3>
        <ul className="space-y-3">
          <li>
            <strong>1. Trasparenza Costante</strong>: Saprai sempre quando stai
            parlando con un&apos;IA. Un banner ti lo ricorda in ogni chat.
          </li>
          <li>
            <strong>2. Supervisione Umana</strong>: Insegnanti e genitori vedono
            tutte le tue chat e possono intervenire in qualsiasi momento
          </li>
          <li>
            <strong>3. Contenuto Filtrato</strong>: L&apos;IA non genererà mai
            contenuti violenti, espliciti o inappropriati per la tua età
          </li>
          <li>
            <strong>4. Limiti di Utilizzo</strong>: Hai budget giornaliero di
            interazioni con l&apos;IA per evitare dipendenza e mantenere la
            concentrazione
          </li>
          <li>
            <strong>5. Doppio Consenso</strong> (per minori): Sia tu che i tuoi
            genitori dovete approvare l&apos;uso dell&apos;IA
          </li>
        </ul>
      </Section>
    </>
  );
}
