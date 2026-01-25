"use client";

import { Building2, CheckCircle } from "lucide-react";
import { EnterpriseForm } from "@/components/contact/enterprise-form";
import { useState } from "react";

export default function EnterpriseContactPage() {
  const [isSuccess] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        {isSuccess ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6 max-w-md w-full">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Richiesta Inviata!
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Grazie per il tuo interesse in MirrorBuddy Enterprise. Il nostro
                team vi contatterà presto per discutere le vostre esigenze.
              </p>
              <button
                onClick={() => (window.location.href = "/")}
                className="w-full px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Torna alla Home
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
                  Contattaci Enterprise
                </h1>
              </div>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">
                Scopri come MirrorBuddy può trasformare l&apos;apprendimento
                della tua azienda
              </p>
              <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    •
                  </span>
                  <span>Personalizzazione completa e branding aziendale</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    •
                  </span>
                  <span>Analitiche avanzate e reporting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                    •
                  </span>
                  <span>Integrazione con i vostri sistemi</span>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
              <EnterpriseForm />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
