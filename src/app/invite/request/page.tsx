"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth/csrf-client";

type FormState = "idle" | "submitting" | "success" | "error";

export default function InviteRequestPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [motivation, setMotivation] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("submitting");
    setErrorMessage("");

    try {
      // Get trial session ID if available
      const visitorId =
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("mirrorbuddy-visitor-id="))
          ?.split("=")[1] || undefined;

      const response = await csrfFetch("/api/invites/request", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          motivation,
          visitorId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormState("error");
        setErrorMessage(data.error || "Errore durante l'invio");
        return;
      }

      setFormState("success");
    } catch {
      setFormState("error");
      setErrorMessage("Errore di connessione. Riprova.");
    }
  };

  if (formState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Richiesta Inviata!
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Grazie per il tuo interesse in MirrorBuddy! Ti contatteremo presto
            via email con le credenziali di accesso.
          </p>
          <Button onClick={() => router.push("/welcome")} className="w-full">
            Torna alla Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </button>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Richiedi Accesso Beta
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-2">
            MirrorBuddy e in beta privata. Compila il form per richiedere
            l&apos;accesso.
          </p>
        </div>

        {formState === "error" && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Nome *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              disabled={formState === "submitting"}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Il tuo nome"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={formState === "submitting"}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="la-tua@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="motivation"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Perche vuoi usare MirrorBuddy? *
            </label>
            <textarea
              id="motivation"
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              required
              minLength={20}
              rows={4}
              disabled={formState === "submitting"}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
              placeholder="Raccontaci un po' di te e perche sei interessato..."
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Minimo 20 caratteri
            </p>
          </div>

          <Button
            type="submit"
            disabled={formState === "submitting"}
            className="w-full"
          >
            {formState === "submitting" ? (
              "Invio in corso..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Invia Richiesta
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Riceverai una email di conferma e, se approvato, le credenziali di
          accesso.
        </p>
      </div>
    </div>
  );
}
