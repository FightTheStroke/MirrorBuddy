import { test, expect } from './fixtures/base-fixtures';
import type { Page } from '@playwright/test';
import it from '../messages/it/chat.json';
import { textPdf, twoPagePdf } from './helpers/attachment-pdf';
import {
  ATTACHMENT_LIMIT_PARAMS,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_PAGES,
} from '../src/lib/conversation/attachments/limits';

const labels = it.chat.attachments;
const withLimits = (message: string) =>
  message
    .replaceAll('{pages}', String(ATTACHMENT_LIMIT_PARAMS.pages))
    .replaceAll('{mb}', String(ATTACHMENT_LIMIT_PARAMS.mb));
const attachmentPath = /\/api\/conversations\/[^/]+\/attachments$/;

async function openConversation(page: Page) {
  await page.goto('/it/maestri/manzoni');
  await expect(page.locator('textarea')).toBeVisible();
}

async function choosePdf(page: Page, name: string, buffer: Buffer) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: labels.attach, exact: true }).click();
  await (await chooser).setFiles({ name, mimeType: 'application/pdf', buffer });
}

async function consent(page: Page) {
  await page.getByRole('button', { name: labels.consent.confirm, exact: true }).click();
}

test.describe('PDF attachments as a student uses them', () => {
  test('Enter cannot submit a question before its PDF finishes saving', async ({ page }) => {
    let releaseSave!: () => void;
    const saving = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const submitted: Array<{ attachmentIds?: string[] }> = [];
    await page.route('**/api/conversations/*/attachments', async (route) => {
      if (route.request().method() === 'POST') await saving;
      await route.continue();
    });
    await page.route('**/api/chat', async (route) => {
      submitted.push(route.request().postDataJSON());
      await route.fulfill({ json: { content: 'Synthetic provider response.' } });
    });
    try {
      await openConversation(page);
      await choosePdf(page, 'Slow.pdf', twoPagePdf());
      await consent(page);
      await expect(page.getByText(labels.status.saving, { exact: true })).toBeVisible();
      await page.locator('textarea').fill('Spiega il documento');
      await page.locator('textarea').press('Enter');
      await expect(page.locator('textarea')).toHaveValue('Spiega il documento');
      expect(submitted).toHaveLength(0);
      releaseSave();
      await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
      await page.locator('textarea').press('Enter');
      await expect.poll(() => submitted.length).toBe(1);
      expect(submitted[0].attachmentIds).toHaveLength(1);
    } finally {
      releaseSave();
    }
  });

  test('waits for history before accepting another PDF or a question', async ({ page }) => {
    await openConversation(page);
    await choosePdf(page, 'Existing.pdf', twoPagePdf());
    await consent(page);
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
    let releaseRestore!: () => void;
    let restoreRequested!: () => void;
    const pending = new Promise<void>((resolve) => {
      restoreRequested = resolve;
    });
    const restoring = new Promise<void>((resolve) => {
      releaseRestore = resolve;
    });
    await page.route('**/api/conversations/*/attachments', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      restoreRequested();
      await restoring;
      await route.fulfill({ response });
    });
    try {
      await page.reload();
      await pending;
      await expect(page.getByRole('button', { name: labels.attach, exact: true })).toBeDisabled();
      await expect(page.locator('textarea')).toBeDisabled();
      releaseRestore();
      await expect(page.getByText('Existing.pdf', { exact: true })).toBeVisible();
      await expect(page.locator('textarea')).toBeEnabled();
      await choosePdf(page, 'New.pdf', textPdf(['New lesson']));
      await consent(page);
      await expect(page.getByText('New.pdf', { exact: true })).toBeVisible();
      await expect(page.getByText(labels.status.ready, { exact: true })).toHaveCount(2);
    } finally {
      releaseRestore();
    }
  });

  test('attaches a 3 MB PDF through the paperclip and preserves its extracted content on reload', async ({
    page,
  }, testInfo) => {
    await openConversation(page);
    const buffer = textPdf(
      ['The observatory access code is VIOLET-1847.', 'The telescope has seven mirrors.'],
      3 * 1024 * 1024,
    );
    expect(buffer.length).toBeGreaterThan(3 * 1024 * 1024);
    const saved = page.waitForResponse(
      (r) => attachmentPath.test(r.url()) && r.request().method() === 'POST',
    );
    await expect(page.getByText(withLimits(labels.hint), { exact: true })).toBeVisible();
    await choosePdf(page, 'Appunti di astronomia.pdf', buffer);
    await expect(page.getByRole('dialog')).toContainText(withLimits(labels.consent.limits));
    await consent(page);
    await expect(page.getByText('Appunti di astronomia.pdf', { exact: true })).toBeVisible();
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
    const response = await saved;
    expect(response.status()).toBe(201);
    const { attachment } = await response.json();
    expect(attachment.size).toBe(buffer.length);
    expect(attachment.pages).toEqual([
      { pageNumber: 1, text: 'The observatory access code is VIOLET-1847.' },
      { pageNumber: 2, text: 'The telescope has seven mirrors.' },
    ]);
    await page.screenshot({ path: testInfo.outputPath('3mb-pdf-ready.png'), fullPage: true });
    await page.reload();
    await expect(page.getByText('Appunti di astronomia.pdf', { exact: true })).toBeVisible();
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
  });

  test('shows an actionable error for a multipage handout, not a disappearing document', async ({
    page,
  }) => {
    await openConversation(page);
    await choosePdf(
      page,
      'Dispensa.pdf',
      textPdf(Array.from({ length: MAX_ATTACHMENT_PAGES + 1 }, (_, i) => `Lesson page ${i + 1}`)),
    );
    await consent(page);
    const item = page.getByRole('listitem').filter({ hasText: 'Dispensa.pdf' });
    await expect(item).toContainText(withLimits(labels.errors.tooManyPages));
    // Retrying the same file cannot help: only removing it or choosing another one can.
    await expect(
      item.getByRole('button', { name: labels.retryLabel.replace('{name}', 'Dispensa.pdf') }),
    ).toHaveCount(0);
    await expect(
      item.getByRole('button', { name: labels.removeLabel.replace('{name}', 'Dispensa.pdf') }),
    ).toBeVisible();
  });

  test('declining consent sends nothing and the same PDF can be selected again', async ({
    page,
  }) => {
    let saves = 0;
    page.on('request', (request) => {
      if (attachmentPath.test(request.url()) && request.method() === 'POST') saves += 1;
    });
    await openConversation(page);
    await choosePdf(page, 'Notes.pdf', twoPagePdf());
    // The dialog's corner close button shares the "decline" name; use the footer action.
    await page
      .getByRole('dialog')
      .getByRole('button', { name: labels.consent.decline, exact: true })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(saves).toBe(0);
    await expect(page.getByText('Notes.pdf', { exact: true })).toHaveCount(0);
    await choosePdf(page, 'Notes.pdf', twoPagePdf());
    await consent(page);
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
    expect(saves).toBe(1);
  });

  test('keeps a failed save visible and retries without selecting the PDF again', async ({
    page,
  }) => {
    let attempts = 0;
    await page.route('**/api/conversations/*/attachments', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      attempts += 1;
      if (attempts === 1) return route.fulfill({ status: 503, json: { code: 'REQUEST_FAILED' } });
      return route.continue();
    });
    await openConversation(page);
    await choosePdf(page, 'Retry.pdf', twoPagePdf());
    await consent(page);
    const item = page.getByRole('listitem').filter({ hasText: 'Retry.pdf' });
    await expect(item).toContainText(labels.errors.generic);
    await item
      .getByRole('button', { name: labels.retryLabel.replace('{name}', 'Retry.pdf') })
      .click();
    await expect(item).toContainText(labels.status.ready);
    expect(attempts).toBe(2);
  });

  test('rejects a corrupt PDF visibly and allows removing it and choosing a valid file', async ({
    page,
  }) => {
    await openConversation(page);
    await choosePdf(page, 'Broken.pdf', Buffer.from('%PDF-1.7\nnot a document'));
    await consent(page);
    const item = page.getByRole('listitem').filter({ hasText: 'Broken.pdf' });
    await expect(item).toContainText(labels.errors.unreadable);
    await item
      .getByRole('button', { name: labels.removeLabel.replace('{name}', 'Broken.pdf') })
      .click();
    await expect(item).toHaveCount(0);
    await choosePdf(page, 'Valid.pdf', twoPagePdf());
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
  });

  test('rejects files larger than 5 MB before saving and states the limit', async ({ page }) => {
    await openConversation(page);
    await choosePdf(page, 'Too large.pdf', textPdf(['Large notes'], MAX_ATTACHMENT_BYTES));
    await consent(page);
    await expect(page.getByRole('listitem').filter({ hasText: 'Too large.pdf' })).toContainText(
      withLimits(labels.errors.tooLarge),
    );
  });

  test('selects two PDFs together and removes only the chosen document', async ({ page }) => {
    await openConversation(page);
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: labels.attach, exact: true }).click();
    await (
      await chooser
    ).setFiles([
      { name: 'First.pdf', mimeType: 'application/pdf', buffer: twoPagePdf() },
      { name: 'Second.pdf', mimeType: 'application/pdf', buffer: textPdf(['Second lesson']) },
    ]);
    await consent(page);
    await expect(page.getByText(labels.status.ready, { exact: true })).toHaveCount(2);
    await page
      .getByRole('button', { name: labels.removeLabel.replace('{name}', 'First.pdf') })
      .click();
    await expect(page.getByText('First.pdf', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Second.pdf', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Second.pdf', { exact: true })).toBeVisible();
    await expect(page.getByText('First.pdf', { exact: true })).toHaveCount(0);
  });
});
