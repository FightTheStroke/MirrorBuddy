"use client";

import { useState } from "react";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { csrfFetch } from "@/lib/auth/csrf-client";
import { logger } from "@/lib/logger";

const SECTORS = [
  { value: "technology", label: "Tecnologia" },
  { value: "finance", label: "Finanza" },
  { value: "manufacturing", label: "Manifattura" },
  { value: "healthcare", label: "Sanità" },
  { value: "retail", label: "Retail" },
  { value: "other", label: "Altro" },
];

const EMPLOYEE_COUNTS = [
  { value: "under-50", label: "Meno di 50" },
  { value: "50-200", label: "50-200" },
  { value: "200-1000", label: "200-1000" },
  { value: "over-1000", label: "Più di 1000" },
];

const TOPICS = [
  { value: "leadership", label: "Leadership" },
  { value: "ai-innovation", label: "AI & Innovazione" },
  { value: "soft-skills", label: "Soft Skills" },
  { value: "onboarding", label: "Onboarding" },
  { value: "compliance", label: "Compliance" },
  { value: "other", label: "Altro" },
];

type FormState = "idle" | "submitting" | "success" | "error";

interface FormErrors {
  name?: string;
  email?: string;
  role?: string;
  company?: string;
  sector?: string;
  employeeCount?: string;
  topics?: string;
  general?: string;
}

export function EnterpriseForm() {
  const [formState, setFormState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    company: "",
    sector: "",
    employeeCount: "",
    topics: [] as string[],
    message: "",
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = "Nome obbligatorio";
    if (!formData.email.trim()) newErrors.email = "Email obbligatoria";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Inserisci un'email valida";
    if (!formData.role.trim()) newErrors.role = "Ruolo obbligatorio";
    if (!formData.company.trim())
      newErrors.company = "Nome azienda obbligatorio";
    if (!formData.sector) newErrors.sector = "Seleziona un settore";
    if (!formData.employeeCount)
      newErrors.employeeCount = "Seleziona il numero di dipendenti";
    if (formData.topics.length === 0)
      newErrors.topics = "Seleziona almeno un tema di interesse";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormState("submitting");
    setErrors({});

    try {
      const response = await csrfFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          type: "enterprise",
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role.trim(),
          company: formData.company.trim(),
          sector: formData.sector,
          employeeCount: formData.employeeCount,
          topics: formData.topics,
          message: formData.message.trim() || "",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Errore durante l'invio");
      }
      setFormState("success");
    } catch (error) {
      logger.error("Enterprise contact submission failed", {
        error: String(error),
      });
      const message =
        error instanceof Error && /csrf/i.test(error.message)
          ? "Sessione scaduta. Ricarica la pagina e riprova."
          : error instanceof Error
            ? error.message
            : "Errore durante l'invio";
      setErrors({ general: message });
      setFormState("error");
    }
  };

  if (formState === "success") {
    return (
      <div className="text-center space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Richiesta Inviata!
        </h2>
        <p className="text-slate-600 dark:text-slate-300">
          Il nostro team vi contatterà presto per discutere le vostre esigenze.
        </p>
        <Button onClick={() => (window.location.href = "/")}>
          Torna alla Home
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.general}
          </p>
        </div>
      )}

      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Nome *
        </label>
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          disabled={formState === "submitting"}
          placeholder="Il tuo nome completo"
          className={errors.name ? "border-red-500" : ""}
        />
        {errors.name && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {errors.name}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Email *
        </label>
        <Input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          disabled={formState === "submitting"}
          placeholder="la-tua@azienda.com"
          className={errors.email ? "border-red-500" : ""}
        />
        {errors.email && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {errors.email}
          </p>
        )}
      </div>

      {/* Role */}
      <div>
        <label
          htmlFor="role"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Ruolo *
        </label>
        <Input
          type="text"
          id="role"
          value={formData.role}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, role: e.target.value }))
          }
          disabled={formState === "submitting"}
          placeholder="es. Director, Manager, CTO"
          className={errors.role ? "border-red-500" : ""}
        />
        {errors.role && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {errors.role}
          </p>
        )}
      </div>

      {/* Company */}
      <div>
        <label
          htmlFor="company"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Nome Azienda *
        </label>
        <Input
          type="text"
          id="company"
          value={formData.company}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, company: e.target.value }))
          }
          disabled={formState === "submitting"}
          placeholder="Nome della vostra azienda"
          className={errors.company ? "border-red-500" : ""}
        />
        {errors.company && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {errors.company}
          </p>
        )}
      </div>

      {/* Sector */}
      <div>
        <label
          htmlFor="sector"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Settore *
        </label>
        <select
          id="sector"
          value={formData.sector}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, sector: e.target.value }))
          }
          disabled={formState === "submitting"}
          className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
            errors.sector
              ? "border-red-500"
              : "border-slate-300 dark:border-slate-600"
          }`}
        >
          <option value="">Seleziona un settore</option>
          {SECTORS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {errors.sector && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {errors.sector}
          </p>
        )}
      </div>

      {/* Employee Count */}
      <div>
        <label
          htmlFor="employeeCount"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          N° Dipendenti *
        </label>
        <select
          id="employeeCount"
          value={formData.employeeCount}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, employeeCount: e.target.value }))
          }
          disabled={formState === "submitting"}
          className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
            errors.employeeCount
              ? "border-red-500"
              : "border-slate-300 dark:border-slate-600"
          }`}
        >
          <option value="">Seleziona una fascia</option>
          {EMPLOYEE_COUNTS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {errors.employeeCount && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {errors.employeeCount}
          </p>
        )}
      </div>

      {/* Topics */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Temi di interesse *
        </label>
        <div className="space-y-2">
          {TOPICS.map((topic) => (
            <div key={topic.value} className="flex items-center">
              <input
                type="checkbox"
                id={`topic-${topic.value}`}
                value={topic.value}
                checked={formData.topics.includes(topic.value)}
                onChange={(e) => {
                  const newTopics = e.target.checked
                    ? [...formData.topics, topic.value]
                    : formData.topics.filter((t) => t !== topic.value);
                  setFormData((prev) => ({ ...prev, topics: newTopics }));
                }}
                disabled={formState === "submitting"}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
              <label
                htmlFor={`topic-${topic.value}`}
                className="ml-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {topic.label}
              </label>
            </div>
          ))}
        </div>
        {errors.topics && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {errors.topics}
          </p>
        )}
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Messaggio
        </label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, message: e.target.value }))
          }
          disabled={formState === "submitting"}
          rows={4}
          placeholder="Condividi i tuoi requisiti specifici..."
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={formState === "submitting"}
        className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
      >
        {formState === "submitting" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Invio in corso...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Invia Richiesta Enterprise
          </>
        )}
      </Button>
    </form>
  );
}
