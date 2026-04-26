import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfigErrorView } from './config-error-view';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('ConfigErrorView', () => {
  it('should not display deprecated AZURE_OPENAI_REALTIME_API_VERSION guidance', () => {
    render(
      <ConfigErrorView
        error={{ error: 'config_error', message: 'Missing configuration' }}
        onClose={vi.fn()}
      />,
    );

    const codeBlock = screen.getByText((content) =>
      content.includes('AZURE_OPENAI_REALTIME_ENDPOINT=https://your-resource.openai.azure.com'),
    );

    expect(codeBlock.textContent).toContain('AZURE_OPENAI_REALTIME_ENDPOINT=');
    expect(codeBlock.textContent).toContain('AZURE_OPENAI_REALTIME_API_KEY=');
    expect(codeBlock.textContent).toContain('AZURE_OPENAI_REALTIME_DEPLOYMENT=');
    expect(codeBlock.textContent).not.toContain('AZURE_OPENAI_REALTIME_API_VERSION=');
  });
});
