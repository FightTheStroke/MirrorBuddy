'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { csrfFetch } from '@/lib/auth';

type ContributionType = 'feedback' | 'tip' | 'resource' | 'question';

interface SubmitErrorBody {
  error?: string;
  flags?: string[];
}

const REWARD_BY_TYPE: Record<ContributionType, number> = {
  feedback: 10,
  tip: 20,
  resource: 30,
  question: 5,
};

const INITIAL_STATE = {
  type: 'feedback' as ContributionType,
  title: '',
  content: '',
};

export function ContributionForm() {
  const tContributionForm = useTranslations('community.contributionForm');
  const tToasts = useTranslations('community.toasts');
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const rewardPreview = useMemo(() => REWARD_BY_TYPE[formData.type], [formData.type]);

  const handleChange = (
    event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await csrfFetch('/api/community/submit', {
        method: 'POST',
        body: JSON.stringify({
          type: formData.type,
          title: formData.title.trim(),
          content: formData.content.trim(),
        }),
      });

      const body = (await response.json()) as SubmitErrorBody;

      if (!response.ok) {
        if (response.status === 422) {
          const firstFlag = body.flags?.[0] ?? 'content:review';
          setErrorMessage(`${tToasts('flaggedForModeration')}: ${firstFlag}`);
          return;
        }

        setErrorMessage(body.error ?? tToasts('submitError'));
        return;
      }

      setFormData(INITIAL_STATE);
      setSuccessMessage(tToasts('submitSuccess'));
    } catch {
      setErrorMessage(tToasts('submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border p-4"
      aria-label={tContributionForm('title')}
    >
      <div className="space-y-1">
        <label htmlFor="contribution-type" className="text-sm font-medium">
          {tContributionForm('contributionType')}
        </label>
        <select
          id="contribution-type"
          name="type"
          aria-label={tContributionForm('contributionType')}
          className="w-full rounded border px-3 py-2"
          value={formData.type}
          onChange={handleChange}
          disabled={isSubmitting}
        >
          <option value="feedback">{tContributionForm('feedback')}</option>
          <option value="tip">{tContributionForm('tip')}</option>
          <option value="resource">{tContributionForm('resource')}</option>
          <option value="question">{tContributionForm('question')}</option>
        </select>
      </div>

      <p className="text-sm font-medium">
        {tContributionForm('rewardPreview')} {rewardPreview}
      </p>

      <div className="space-y-1">
        <label htmlFor="contribution-title" className="text-sm font-medium">
          {tContributionForm('contributionTitle')}
        </label>
        <input
          id="contribution-title"
          name="title"
          aria-label={tContributionForm('contributionTitle')}
          className="w-full rounded border px-3 py-2"
          value={formData.title}
          onChange={handleChange}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="contribution-content" className="text-sm font-medium">
          {tContributionForm('contributionContent')}
        </label>
        <textarea
          id="contribution-content"
          name="content"
          aria-label={tContributionForm('contributionContent')}
          className="w-full rounded border px-3 py-2"
          value={formData.content}
          onChange={handleChange}
          disabled={isSubmitting}
          rows={4}
          required
        />
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          {successMessage}
        </div>
      )}

      <button
        type="submit"
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? tContributionForm('submittingButton') : tContributionForm('submitButton')}
      </button>
    </form>
  );
}
