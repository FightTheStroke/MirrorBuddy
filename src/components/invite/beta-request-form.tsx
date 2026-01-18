"use client";

import { useState } from "react";
import { Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { csrfFetch } from "@/lib/auth/csrf-client";

interface BetaRequestFormProps {
  visitorId?: string;
  trialSessionId?: string;
  onSuccess?: () => void;
}

type FormState = "idle" | "submitting" | "success" | "error";

interface FormErrors {
  name?: string;
  email?: string;
  motivation?: string;
  general?: string;
}

export function BetaRequestForm({
  visitorId,
  trialSessionId,
  onSuccess,
}: BetaRequestFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [motivation, setMotivation] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Il nome e obbligatorio";
    } else if (name.trim().length < 2) {
      newErrors.name = "Il nome deve avere almeno 2 caratteri";
    }

    if (!email.trim()) {
      newErrors.email = "L'email e obbligatoria";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Inserisci un'email valida";
    }

    if (!motivation.trim()) {
      newErrors.motivation = "Raccontaci perche vuoi usare MirrorBuddy";
    } else if (motivation.trim().length < 20) {
      newErrors.motivation = "Scrivi almeno 20 caratteri";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setState("submitting");
    setErrors({});

    try {
      const response = await csrfFetch("/api/invites/request", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          motivation: motivation.trim(),
          visitorId,
          trialSessionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setErrors({ email: "Questa email ha gia una richiesta in corso" });
          setState("idle");
          return;
        }
        throw new Error(data.error || "Errore durante l'invio");
      }

      setState("success");
      onSuccess?.();
    } catch (error) {
      setErrors({
        general:
          error instanceof Error ? error.message : "Errore durante l'invio",
      });
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
          Richiesta inviata!
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
          Ti contatteremo presto via email per confermare il tuo accesso alla
          beta di MirrorBuddy.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">
            {errors.general}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="name"
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Nome
        </label>
        <Input
          id="name"
          type="text"
          placeholder="Il tuo nome"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
          disabled={state === "submitting"}
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="la-tua-email@esempio.com"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEmail(e.target.value)
          }
          disabled={state === "submitting"}
          className={errors.email ? "border-red-500" : ""}
        />
        {errors.email && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="motivation"
          className="text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Perche vuoi usare MirrorBuddy?
        </label>
        <textarea
          id="motivation"
          placeholder="Raccontaci come pensi di usare MirrorBuddy per studiare..."
          value={motivation}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setMotivation(e.target.value)
          }
          disabled={state === "submitting"}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
            errors.motivation
              ? "border-red-500"
              : "border-slate-200 dark:border-slate-700"
          }`}
        />
        {errors.motivation && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {errors.motivation}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={state === "submitting"}
      >
        {state === "submitting" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Invio in corso...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Richiedi accesso Beta
          </>
        )}
      </Button>
    </form>
  );
}

export default BetaRequestForm;
