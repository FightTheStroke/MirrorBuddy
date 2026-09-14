import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import { UsersExport } from '../users-export';
import { parseUserListQuery } from '@/lib/admin/user-list-query';
import itMessages from '../../../../../messages/it/admin.json';
import enMessages from '../../../../../messages/en/admin.json';
import frMessages from '../../../../../messages/fr/admin.json';
import deMessages from '../../../../../messages/de/admin.json';
import esMessages from '../../../../../messages/es/admin.json';

vi.unmock('next-intl');
afterEach(cleanup);

const cases = [
  {
    locale: 'it',
    messages: itMessages,
    one: "Seleziona l'utente corrispondente",
    two: 'Seleziona tutti i 2 utenti corrispondenti',
  },
  {
    locale: 'en',
    messages: enMessages,
    one: 'Select the matching user',
    two: 'Select all 2 matching users',
  },
  {
    locale: 'fr',
    messages: frMessages,
    one: "Sélectionner l'utilisateur correspondant",
    two: 'Sélectionner les 2 utilisateurs correspondants',
  },
  {
    locale: 'de',
    messages: deMessages,
    one: 'Den passenden Benutzer auswählen',
    two: 'Alle 2 passenden Benutzer auswählen',
  },
  {
    locale: 'es',
    messages: esMessages,
    one: 'Seleccionar el usuario coincidente',
    two: 'Seleccionar los 2 usuarios coincidentes',
  },
];

describe.each(cases)(
  'actual $locale ICU select-matching copy',
  ({ locale, messages, one, two }) => {
    it.each([1, 2])('formats count %s with the correct grammatical number', (count) => {
      const t = createTranslator({
        locale,
        messages,
        namespace: 'admin.users.pagination',
        onError: (error) => {
          throw error;
        },
      });
      expect(t('selectMatching', { count })).toBe(count === 1 ? one : two);
    });
  },
);

it('exposes the filtered-export label as an accessible group name', () => {
  const name = enMessages.admin.users.pagination.exportFiltered;
  render(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={enMessages}>
      <UsersExport query={parseUserListQuery()} disabled={false} />
    </NextIntlClientProvider>,
  );
  const group = screen.getByRole('group', { name });
  expect(group).toHaveAccessibleName(name);
  expect(within(group).getByRole('button', { name: 'CSV' })).toBeEnabled();
  expect(within(group).getByRole('button', { name: 'JSON' })).toBeEnabled();
});
