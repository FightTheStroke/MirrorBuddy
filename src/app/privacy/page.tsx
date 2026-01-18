import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | MirrorBuddy",
  description: "Informativa sulla privacy di MirrorBuddy - GDPR compliant",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Informativa sulla Privacy
          </h1>
          <p className="text-slate-600">
            Ultimo aggiornamento: 18 Gennaio 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 prose prose-slate max-w-none">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              1. Titolare del Trattamento
            </h2>
            <p className="text-slate-700">
              Il titolare del trattamento dei tuoi dati personali è{" "}
              <strong>FightTheStroke Foundation</strong>, che opera MirrorBuddy
              come piattaforma educativa per studenti con esigenze speciali.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              2. Dati Raccolti
            </h2>
            <p className="text-slate-700 mb-3">Raccogliamo i seguenti dati:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Session data (token autenticazione, durata sessione)</li>
              <li>
                Statistiche di utilizzo (pagine visitate, tempo trascorso)
              </li>
              <li>Preferenze di accessibilità (contrasto, dimensioni font)</li>
              <li>Log API per monitoraggio e debugging</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              3. Finalità del Trattamento
            </h2>
            <p className="text-slate-700">
              Utilizziamo i dati per migliorare il servizio educativo,
              personalizzare l&apos;esperienza di apprendimento, e monitorare la
              sicurezza della piattaforma.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              4. Base Giuridica
            </h2>
            <p className="text-slate-700 mb-3">Il trattamento si basa su:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>
                <strong>Consenso</strong> esplicito per dati non essenziali
              </li>
              <li>
                <strong>Legittimo interesse</strong> per miglioramento servizio
              </li>
              <li>
                <strong>Obblighi legali</strong> per conformità normativa
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              5. Servizi Terzi
            </h2>
            <p className="text-slate-700 mb-3">
              Utilizziamo i seguenti servizi terzi che possono accedere ai tuoi
              dati:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>
                <strong>Azure OpenAI</strong> - Elaborazione IA conversazionale
              </li>
              <li>
                <strong>Supabase</strong> - Database e autenticazione
              </li>
              <li>
                <strong>Upstash</strong> - Cache e gestione code
              </li>
              <li>
                <strong>Resend</strong> - Invio email
              </li>
              <li>
                <strong>Vercel</strong> - Hosting e deployment
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              6. Diritti dell&apos;Utente (GDPR)
            </h2>
            <p className="text-slate-700 mb-3">Hai il diritto di:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>
                <strong>Accesso</strong> - ricevere copia dei tuoi dati
              </li>
              <li>
                <strong>Rettifica</strong> - correggere dati errati
              </li>
              <li>
                <strong>Cancellazione</strong> - &quot;diritto
                all&apos;oblio&quot;
              </li>
              <li>
                <strong>Portabilità</strong> - ricevere dati in formato
                leggibile
              </li>
              <li>
                <strong>Opposizione</strong> - a trattamenti specifici
              </li>
            </ul>
            <p className="text-slate-700 mt-3">
              Per esercitare questi diritti, contattaci all&apos;indirizzo email
              sottostante.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              7. Contatti
            </h2>
            <p className="text-slate-700">
              Per domande sulla privacy o per esercitare i tuoi diritti:
            </p>
            <div className="mt-3 p-4 bg-slate-100 rounded-lg">
              <p className="text-slate-900 font-medium">
                roberdan@fightthestroke.org
              </p>
              <p className="text-slate-600 text-sm mt-1">
                Titolare del trattamento: FightTheStroke Foundation
              </p>
            </div>
          </section>

          {/* Cookie Link */}
          <section className="pt-6 border-t border-slate-200">
            <p className="text-slate-700">
              Per informazioni sui cookie, consulta la nostra{" "}
              <Link
                href="/cookies"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                informativa sui cookie
              </Link>
              .
            </p>
          </section>
        </div>

        {/* Footer Link */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="text-slate-600 hover:text-slate-900 underline"
          >
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}
