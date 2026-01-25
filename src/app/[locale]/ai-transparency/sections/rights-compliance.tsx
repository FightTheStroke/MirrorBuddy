"use client";

import { Section } from "../sections";

export function RightsComplianceSections() {
  return (
    <>
      <Section number={5} title="I Tuoi Diritti">
        <p>
          Secondo la legge italiana (Legge 132/2025) e il GDPR, hai diritto a:
        </p>
        <ul className="space-y-2">
          <li>
            <strong>Sapere che stai usando l&apos;IA</strong>: Essere informato
            sempre quando un sistema automatico genera risposte
          </li>
          <li>
            <strong>Capire come funziona</strong>: Ricevere spiegazioni chiare
            su come il Maestro IA sceglie di rispondere
          </li>
          <li>
            <strong>Rifiutare l&apos;IA</strong>: Puoi scegliere di parlare solo
            con insegnanti umani, senza perdere accesso alla piattaforma
          </li>
          <li>
            <strong>Accedere ai tuoi dati</strong>: Richiedere copia di tutte le
            chat, i feedback e i dati che l&apos;IA ha processato su di te
          </li>
          <li>
            <strong>Correggere o cancellare i dati</strong>: Se un dato è
            inesatto, puoi chiedere che sia corretto o eliminato
          </li>
          <li>
            <strong>Presentare reclami</strong>: Se pensi che l&apos;IA non
            rispetti i tuoi diritti, puoi segnalare il problema
          </li>
        </ul>
      </Section>

      <Section number={6} title="Come Proteggono i Tuoi Dati">
        <p>
          Tutti i dati che condividi con i Maestri sono protetti come previsto
          dal GDPR (legge europea sulla privacy):
        </p>
        <ul className="space-y-2">
          <li>
            <strong>Crittografia</strong>: I dati sono criptati sia quando
            viggiano (in transito) che quando stoccati nei server
          </li>
          <li>
            <strong>Non venduti</strong>: I tuoi dati NON sono mai venduti a
            terzi o usati per pubblicità
          </li>
          <li>
            <strong>Accesso Ristretto</strong>: Solo MirrorBuddy e Microsoft
            (che ospita i server) possono accedere ai dati
          </li>
          <li>
            <strong>Conservazione Limitata</strong>: I dati sono mantenuti solo
            finché necessario per l&apos;educazione
          </li>
          <li>
            <strong>Diritto all&apos;Oblio</strong>: Puoi chiedere che tutti i
            tuoi dati siano cancellati
          </li>
        </ul>
      </Section>

      <Section number={7} title="Rischi e Come Li Gestiamo">
        <p>
          Come con qualsiasi IA, ci sono alcuni rischi. Ecco come li
          affrontiamo:
        </p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700">
                <th className="border border-slate-300 dark:border-slate-600 p-3 text-left font-semibold">
                  Rischio
                </th>
                <th className="border border-slate-300 dark:border-slate-600 p-3 text-left font-semibold">
                  Come lo preveniamo
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  Contenuti inappropriati
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  Filtri automatici + revisione umana
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  Risposte inaccurate
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  Knowledge bases verificate, fallback umano
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  Bias o discriminazione
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  Test bimestrale sui bias, dataset diversi
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  Privacy breach
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  Encryption, audit di sicurezza, GDPR compliance
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  Dipendenza dall&apos;IA
                </td>
                <td className="border border-slate-300 dark:border-slate-600 p-3">
                  Budget giornaliero, controlli genitoriali, opzione opt-out
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section number={8} title="Conformità Legale">
        <p>
          MirrorBuddy è conforme alle seguenti normative europee e italiane:
        </p>
        <ul className="space-y-2">
          <li>
            <strong>AI Act (UE 2024/1689)</strong>: Regolamento europeo sulla IA
            ad alto rischio in ambito educativo e protezione dei minori
          </li>
          <li>
            <strong>Legge 132/2025</strong>: Attuazione italiana dell&apos;AI
            Act con diritti degli utenti e responsabilità dei fornitori
          </li>
          <li>
            <strong>GDPR (UE 2016/679)</strong>: Protezione dei dati personali e
            privacy
          </li>
          <li>
            <strong>Codice della Privacy italiano</strong>: Implementazione
            nazionale della protezione dati
          </li>
        </ul>
        <p className="mt-4">
          MirrorBuddy è classificato come{" "}
          <strong>sistema IA ad alto rischio</strong> perché supporta
          l&apos;apprendimento di minori con difficoltà cognitive. Di
          conseguenza, implementiamo misure rigorose di trasparenza,
          supervisione e protezione.
        </p>
      </Section>
    </>
  );
}
