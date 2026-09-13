import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import itMessages from '../../../../messages/it/admin.json';
import enMessages from '../../../../messages/en/admin.json';
import frMessages from '../../../../messages/fr/admin.json';
import deMessages from '../../../../messages/de/admin.json';
import esMessages from '../../../../messages/es/admin.json';
import { AdminBreadcrumbs } from '../admin-breadcrumbs';

vi.unmock('next-intl');

const { pathname } = vi.hoisted(() => ({
  pathname: vi.fn(() => '/admin/communications/stats'),
}));

vi.mock('next/navigation', () => ({ usePathname: pathname }));

afterEach(cleanup);

const locales = [
  ['it', itMessages],
  ['en', enMessages],
  ['fr', frMessages],
  ['de', deMessages],
  ['es', esMessages],
] as const;

describe.each(locales)('AdminBreadcrumbs (%s)', (locale, messages) => {
  function renderPath(path: string) {
    pathname.mockReturnValue(path);
    const onError = vi.fn();
    render(
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="Europe/Rome"
        onError={onError}
      >
        <AdminBreadcrumbs />
      </NextIntlClientProvider>,
    );
    return onError;
  }

  it.each(['stats', 'templates', 'campaigns'] as const)(
    'renders the %s string title without next-intl errors',
    (section) => {
      const onError = renderPath(`/admin/communications/${section}`);

      const navigation = screen.getByRole('navigation', {
        name: messages.admin.breadcrumb,
      });
      const current = within(navigation).getByText(messages.admin.communications[section].title);
      expect(current).toHaveAttribute('aria-current', 'page');
      expect(
        within(navigation).getByRole('link', { name: messages.admin.dashboardTitle }),
      ).toHaveAttribute('href', '/admin');
      expect(
        within(navigation).getByRole('link', { name: messages.admin.communications.title }),
      ).toHaveAttribute('href', '/admin/communications');
      expect(onError).not.toHaveBeenCalled();
    },
  );

  it('preserves unrelated translated and humanized breadcrumbs', () => {
    const onError = renderPath('/admin/users/123/edit');

    expect(screen.getByRole('link', { name: messages.admin.sidebar.users })).toHaveAttribute(
      'href',
      '/admin/users',
    );
    expect(screen.getByRole('link', { name: '123' })).toHaveAttribute('href', '/admin/users/123');
    expect(screen.getByText('Edit')).toHaveAttribute('aria-current', 'page');
    expect(onError).not.toHaveBeenCalled();
  });

  it('does not render breadcrumbs on the admin home', () => {
    const onError = renderPath('/admin');

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(onError).not.toHaveBeenCalled();
  });
});
