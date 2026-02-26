'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { csrfFetch } from '@/lib/auth';

type Difficulty = 'easy' | 'medium' | 'hard';

interface SelectOption {
  id: string;
  label: string;
}

interface ExperimentCreateFormProps {
  maestros: SelectOption[];
  syntheticProfiles: SelectOption[];
  onCreated?: (experiment: unknown) => void;
}

interface FormData {
  name: string;
  hypothesis: string;
  maestroId: string;
  syntheticProfileId: string;
  turns: string;
  topic: string;
  difficulty: Difficulty;
}

interface ErrorPayload {
  error?: string;
  message?: string;
}

const INITIAL_FORM_DATA: FormData = {
  name: '',
  hypothesis: '',
  maestroId: '',
  syntheticProfileId: '',
  turns: '5',
  topic: '',
  difficulty: 'medium',
};

export function ExperimentCreateForm({
  maestros,
  syntheticProfiles,
  onCreated,
}: ExperimentCreateFormProps) {
  const t = useTranslations('admin');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (): string | null => {
    if (
      !formData.name ||
      !formData.hypothesis ||
      !formData.maestroId ||
      !formData.syntheticProfileId
    ) {
      return t('research.createForm.validationRequired');
    }

    const turns = Number(formData.turns);
    if (!Number.isInteger(turns) || turns < 1) {
      return t('research.createForm.validationTurns');
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: formData.name.trim(),
      hypothesis: formData.hypothesis.trim(),
      maestroId: formData.maestroId,
      syntheticProfileId: formData.syntheticProfileId,
      turns: Number(formData.turns),
      topic: formData.topic.trim(),
      difficulty: formData.difficulty,
    };

    try {
      const response = await csrfFetch('/api/admin/research/experiments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as ErrorPayload | unknown;

      if (!response.ok) {
        const serverError =
          typeof body === 'object' && body !== null
            ? ((body as ErrorPayload).error ?? (body as ErrorPayload).message)
            : null;

        setError(serverError ?? t('research.createForm.error'));
        return;
      }

      setFormData(INITIAL_FORM_DATA);
      setSuccess(t('research.createForm.success'));
      onCreated?.(body);
    } catch {
      setError(t('research.createForm.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border p-4"
      aria-label={t('research.createForm.ariaLabel')}
    >
      <h2 className="text-lg font-semibold">{t('research.createForm.title')}</h2>

      {error && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>{t('research.createForm.name')}</span>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
            disabled={submitting}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>{t('research.createForm.turns')}</span>
          <input
            name="turns"
            type="number"
            min={1}
            value={formData.turns}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
            disabled={submitting}
          />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span>{t('research.createForm.hypothesis')}</span>
        <textarea
          name="hypothesis"
          value={formData.hypothesis}
          onChange={handleChange}
          className="w-full rounded border px-3 py-2"
          rows={3}
          disabled={submitting}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>{t('research.createForm.maestroId')}</span>
          <select
            name="maestroId"
            value={formData.maestroId}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
            disabled={submitting}
          >
            <option value="">{t('research.createForm.selectPlaceholder')}</option>
            {maestros.map((maestro) => (
              <option key={maestro.id} value={maestro.id}>
                {maestro.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>{t('research.createForm.syntheticProfileId')}</span>
          <select
            name="syntheticProfileId"
            value={formData.syntheticProfileId}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
            disabled={submitting}
          >
            <option value="">{t('research.createForm.selectPlaceholder')}</option>
            {syntheticProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>{t('research.createForm.topic')}</span>
          <input
            name="topic"
            value={formData.topic}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
            disabled={submitting}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>{t('research.createForm.difficulty')}</span>
          <select
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            className="w-full rounded border px-3 py-2"
            disabled={submitting}
          >
            <option value="easy">{t('research.createForm.difficultyEasy')}</option>
            <option value="medium">{t('research.createForm.difficultyMedium')}</option>
            <option value="hard">{t('research.createForm.difficultyHard')}</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={submitting}
      >
        {submitting ? t('research.createForm.submitting') : t('research.createForm.submit')}
      </button>
    </form>
  );
}
