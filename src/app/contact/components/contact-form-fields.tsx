"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

interface ContactFormFieldsProps {
  formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  };
  errors: FormErrors;
  isSubmitting: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
}

export function ContactFormFields({
  formData,
  errors,
  isSubmitting,
  onChange,
}: ContactFormFieldsProps) {
  const renderField = (
    id: string,
    label: string,
    value: string,
    error?: string,
  ) => (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-gray-300"
      >
        {label} <span className="text-red-500">*</span>
      </label>
      <Input
        id={id}
        name={id}
        type={id === "email" ? "email" : "text"}
        value={value}
        onChange={onChange}
        placeholder={`Inserisci ${label.toLowerCase()}`}
        disabled={isSubmitting}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );

  return (
    <>
      {renderField("name", "Nome", formData.name, errors.name)}
      {renderField("email", "Email", formData.email, errors.email)}
      {renderField("subject", "Oggetto", formData.subject, errors.subject)}

      <div className="space-y-2">
        <label
          htmlFor="message"
          className="block text-sm font-medium text-slate-700 dark:text-gray-300"
        >
          Messaggio <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={onChange}
          placeholder="Descrivi il tuo messaggio..."
          disabled={isSubmitting}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
        {errors.message && (
          <p
            id="message-error"
            role="alert"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {errors.message}
          </p>
        )}
      </div>
    </>
  );
}
