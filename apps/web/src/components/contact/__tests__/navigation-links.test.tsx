import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EnterpriseForm } from '../enterprise-form';
import { LearningPathsList } from '@/components/education/learning-path/learning-paths-list';
import { getTranslation } from '@/test/i18n-helpers';
import { csrfFetch } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, ...props }: React.ComponentProps<'a'>) => <a href={`/fr${href}`} {...props} />,
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ordinary page navigation links', () => {
  it('offers a locale-aware home link after a successful enterprise request', async () => {
    vi.mocked(csrfFetch).mockResolvedValue(Response.json({ success: true }));
    const { container } = render(<EnterpriseForm />);
    for (const [id, value] of [
      ['name', 'Student'],
      ['email', 'student@example.com'],
      ['role', 'Teacher'],
      ['company', 'School'],
      ['sector', 'technology'],
      ['employeeCount', '50-200'],
    ]) {
      const input = container.querySelector(`#${id}`);
      if (!input) throw new Error(`Missing field ${id}`);
      fireEvent.change(input, { target: { value } });
    }
    fireEvent.click(screen.getByDisplayValue('leadership'));
    const form = container.querySelector('form');
    if (!form) throw new Error('Missing form');
    fireEvent.submit(form);
    const link = await screen.findByRole('link', {
      name: getTranslation('compliance.contact.enterprise.tornaAllaHome'),
    });
    expect(link).toHaveAttribute('href', '/fr/');
    expect(link.querySelector('button')).toBeNull();
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it('offers a locale-aware study kit link when learning paths are empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ paths: [] })));
    render(<LearningPathsList />);
    const link = await screen.findByRole('link', {
      name: getTranslation('education.learningPath.goToStudyKit'),
    });
    expect(link).toHaveAttribute('href', '/fr/study-kit');
    expect(link.querySelector('button')).toBeNull();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
