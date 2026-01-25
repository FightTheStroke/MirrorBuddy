"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Send,
  BookOpen,
  Users,
  BarChart3,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { csrfFetch } from "@/lib/auth/csrf-client";
import {
  type FormData,
  ROLES,
  SCHOOL_TYPES,
  STUDENT_COUNTS,
} from "./schools-form-constants";

type FormState = "idle" | "submitting" | "success" | "error";

export function SchoolsContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    role: "",
    schoolName: "",
    schoolType: "",
    studentCount: "",
    specificNeeds: "",
    message: "",
  });

  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isFormValid =
    formData.name &&
    formData.email &&
    formData.role &&
    formData.schoolName &&
    formData.schoolType &&
    formData.studentCount &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formState !== "submitting";

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setFormState("submitting");
    setErrorMessage("");

    try {
      const response = await csrfFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          type: "schools",
          name: formData.name,
          email: formData.email,
          role: formData.role,
          schoolName: formData.schoolName,
          schoolType: formData.schoolType,
          studentCount: formData.studentCount,
          specificNeeds: formData.specificNeeds,
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFormState("error");
        setErrorMessage(
          data.message || "Errore durante l'invio. Riprova più tardi.",
        );
        return;
      }

      setFormState("success");
    } catch {
      setFormState("error");
      setErrorMessage(
        "Errore di connessione. Verifica la tua connessione e riprova.",
      );
    }
  };

  if (formState === "success") {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-lg text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Grazie per averci contattato!
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Il tuo messaggio è stato ricevuto. Ti contatteremo entro 24 ore per
            discutere le soluzioni personalizzate per la tua scuola.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Soluzioni per la tua scuola
        </h2>
        <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span>Personalizzazione curricolare</span>
          </div>
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span>Gestione classi e studenti</span>
          </div>
          <div className="flex items-start gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span>Report e analytics per docenti</span>
          </div>
          <div className="flex items-start gap-2">
            <Headphones className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <span>Supporto dedicato</span>
          </div>
        </div>
      </div>

      {formState === "error" && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Nome *"
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Nome"
          />
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Email *"
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Email"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Ruolo"
          >
            <option value="">Ruolo *</option>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <select
            id="schoolType"
            name="schoolType"
            value={formData.schoolType}
            onChange={handleInputChange}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Tipo Scuola"
          >
            <option value="">Tipo Scuola *</option>
            {SCHOOL_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <input
            id="schoolName"
            type="text"
            name="schoolName"
            value={formData.schoolName}
            onChange={handleInputChange}
            placeholder="Nome Scuola *"
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Nome Scuola"
          />
          <select
            id="studentCount"
            name="studentCount"
            value={formData.studentCount}
            onChange={handleInputChange}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Numero Studenti"
          >
            <option value="">Numero Studenti *</option>
            {STUDENT_COUNTS.map((count) => (
              <option key={count.value} value={count.value}>
                {count.label}
              </option>
            ))}
          </select>
        </div>

        <textarea
          id="specificNeeds"
          name="specificNeeds"
          value={formData.specificNeeds}
          onChange={handleInputChange}
          placeholder="Esigenze Specifiche (opzionale)"
          rows={3}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          aria-label="Esigenze Specifiche"
        />

        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleInputChange}
          placeholder="Messaggio (opzionale)"
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          aria-label="Messaggio"
        />
      </div>

      <Button
        type="submit"
        disabled={!isFormValid}
        className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-8 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        {formState === "submitting" ? "Invio in corso..." : "Invia Richiesta"}
      </Button>
    </form>
  );
}
