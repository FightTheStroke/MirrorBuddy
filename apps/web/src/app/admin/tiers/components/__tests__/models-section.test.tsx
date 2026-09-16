import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ModelsSection } from '../models-section';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ModelsSection', () => {
  it('omits voice selection while preserving chat edits and read-only tool models', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify(
            ['gpt-5-mini', 'gpt-5.6-terra'].map((name) => ({
              id: name,
              name,
              displayName: name,
              category: 'chat',
              qualityScore: 4,
              speedScore: 4,
              educationScore: 4,
              inputCostPer1k: 0.001,
              outputCostPer1k: 0.002,
              recommendedFor: [],
              notRecommendedFor: [],
            })),
          ),
        ),
    );
    const onChange = vi.fn();
    render(
      <ModelsSection
        formData={{
          chatModel: 'gpt-5-mini',
          pdfModel: 'gpt-5-mini',
          mindmapModel: 'gpt-5-mini',
          quizModel: 'gpt-5-mini',
          flashcardsModel: 'gpt-5-mini',
          summaryModel: 'gpt-5-mini',
          formulaModel: 'gpt-5-mini',
          chartModel: 'gpt-5-mini',
          homeworkModel: 'gpt-5-mini',
          webcamModel: 'gpt-5-mini',
          demoModel: 'gpt-5-mini',
        }}
        onChange={onChange}
      />,
    );

    const chat = await screen.findByRole('combobox', { name: /Chat/ });
    expect(chat).toBeEnabled();
    expect(screen.getAllByRole('combobox')).toHaveLength(11);
    expect(screen.queryByRole('combobox', { name: /Voce|Voice|Realtime/i })).toBeNull();
    expect(document.getElementById('realtimeModel')).toBeNull();
    for (const select of screen.getAllByRole('combobox')) {
      if (select !== chat) expect(select).toBeDisabled();
    }

    fireEvent.change(chat, { target: { value: 'gpt-5.6-terra' } });
    expect(onChange).toHaveBeenCalledWith({ chatModel: 'gpt-5.6-terra' });
  });
});
