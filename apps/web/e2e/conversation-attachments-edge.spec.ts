import { test, expect } from './fixtures/base-fixtures';
import type { Page } from '@playwright/test';
import it from '../messages/it/chat.json';
import {
  drawingOnlyPdf,
  mixedPdf,
  passwordProtectedPdf,
  textPdf,
  twoPagePdf,
} from './helpers/attachment-pdf';
import {
  mockConsentStorage,
  mockTOS,
  mockTrialConsentCookie,
  mockTrialSession,
  setVisitorCookie,
} from './fixtures/api-mocks';
import { createE2EVisitorId } from './fixtures/visitor-id';

const labels = it.chat.attachments;
const attachmentPath = /\/api\/conversations\/[^/]+\/attachments$/;
const chip = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name });

async function openConversation(page: Page) {
  await page.goto('/it/maestri/manzoni');
  await expect(page.locator('textarea')).toBeEnabled();
}

async function attach(
  page: Page,
  name: string,
  buffer: Buffer,
  { mimeType = 'application/pdf', firstFile = true } = {},
) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: labels.attach, exact: true }).click();
  await (await chooser).setFiles({ name, mimeType, buffer });
  // Consent is asked once per session, before the first file is read.
  if (firstFile) {
    await page.getByRole('button', { name: labels.consent.confirm, exact: true }).click();
  }
}

/** OCR transport is controlled: CI holds no AI credentials. pdf.js rendering stays real. */
async function controlOcr(page: Page, reply: (pageNumber: number) => Promise<string | null>) {
  const calls: Array<{ pageNumber: number; source: string; image: string }> = [];
  await page.route('**/api/chat/attachments/analyze', async (route) => {
    const body = route.request().postDataJSON();
    calls.push(body);
    const text = await reply(body.pageNumber);
    if (text === null) return route.fulfill({ status: 502, json: { code: 'ocr_failed' } });
    return route.fulfill({ json: { text } });
  });
  return calls;
}

test.describe('PDF attachment edge cases a student meets', () => {
  test('reads a scanned PDF by rendering each page and saves the recognised text', async ({
    page,
  }) => {
    const calls = await controlOcr(page, async (n) => `Scanned lesson page ${n}`);
    const saved = page.waitForResponse(
      (r) => attachmentPath.test(r.url()) && r.request().method() === 'POST',
    );
    await openConversation(page);
    await attach(page, 'Scansione.pdf', drawingOnlyPdf(2));
    await expect(chip(page, 'Scansione.pdf')).toContainText(labels.status.ready);
    expect(calls.map((c) => [c.pageNumber, c.source])).toEqual([
      [1, 'pdf'],
      [2, 'pdf'],
    ]);
    expect(calls[0].image).toMatch(/^data:image\/jpeg;base64,.{1000,}/);
    const { attachment } = await (await saved).json();
    expect(attachment.pages).toEqual([
      { pageNumber: 1, text: 'Scanned lesson page 1' },
      { pageNumber: 2, text: 'Scanned lesson page 2' },
    ]);
  });

  test('tells the student when part of a mixed PDF could not be read', async ({ page }) => {
    await controlOcr(page, async () => '');
    await openConversation(page);
    await attach(page, 'Misto.pdf', mixedPdf('Readable first page'));
    await expect(chip(page, 'Misto.pdf')).toContainText('1 pagina senza testo leggibile');
  });

  test('shows an OCR failure and recovers with retry', async ({ page }) => {
    let failing = true;
    await controlOcr(page, async () => (failing ? null : 'Recovered scanned text'));
    await openConversation(page);
    await attach(page, 'Foto libro.pdf', drawingOnlyPdf(1));
    const item = chip(page, 'Foto libro.pdf');
    await expect(item).toContainText(labels.errors.ocrFailed);
    failing = false;
    await item
      .getByRole('button', { name: labels.retryLabel.replace('{name}', 'Foto libro.pdf') })
      .click();
    await expect(item).toContainText(labels.status.ready);
  });

  test('cancelling a slow scanned PDF removes it and saves nothing', async ({ page }) => {
    let saves = 0;
    page.on('request', (r) => {
      if (attachmentPath.test(r.url()) && r.method() === 'POST') saves += 1;
    });
    await controlOcr(page, () => new Promise<string>(() => {}));
    await openConversation(page);
    await attach(page, 'Lento.pdf', drawingOnlyPdf(1));
    const cancel = page.getByRole('button', {
      name: labels.cancelLabel.replace('{name}', 'Lento.pdf'),
    });
    await cancel.click();
    await expect(chip(page, 'Lento.pdf')).toHaveCount(0);
    await expect(
      page.getByRole('status').filter({
        hasText: labels.announce.cancelled.replace('{name}', 'Lento.pdf'),
      }),
    ).toHaveCount(1);
    expect(saves).toBe(0);
  });

  test('explains password-protected and unsupported files', async ({ page }) => {
    await openConversation(page);
    await attach(page, 'Protetto.pdf', passwordProtectedPdf());
    await expect(chip(page, 'Protetto.pdf')).toContainText(labels.errors.encrypted);
    await attach(page, 'Appunti.docx', Buffer.from('not a pdf'), {
      mimeType: 'application/msword',
      firstFile: false,
    });
    await expect(chip(page, 'Appunti.docx')).toContainText(labels.errors.unsupported);
  });
});

test.describe('PDF attachments on a phone', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

  test('attaches a 3 MB PDF by tapping, without horizontal scrolling', async ({ page }) => {
    await openConversation(page);
    const button = page.getByRole('button', { name: labels.attach, exact: true });
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    const chooser = page.waitForEvent('filechooser');
    await button.tap();
    await (
      await chooser
    ).setFiles({
      name: 'Compito di storia con un nome molto lungo per il telefono.pdf',
      mimeType: 'application/pdf',
      buffer: textPdf(['Mobile homework text'], 3 * 1024 * 1024),
    });
    await page.getByRole('button', { name: labels.consent.confirm, exact: true }).tap();
    await expect(page.getByText(labels.status.ready, { exact: true })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('PDF attachments for a visitor without an account', () => {
  test('keeps the PDF in the tab and sends its pages with the question', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    try {
      const visitorId = createE2EVisitorId();
      await mockTOS(page);
      await mockConsentStorage(context);
      await mockTrialConsentCookie(context);
      await setVisitorCookie(context, visitorId);
      await mockTrialSession(page, visitorId);
      const sent: Array<{ attachments?: Array<{ pages: unknown[] }> }> = [];
      await page.route('**/api/chat', async (route) => {
        sent.push(route.request().postDataJSON());
        await route.fulfill({ json: { content: 'Synthetic provider response.' } });
      });
      let saves = 0;
      page.on('request', (r) => {
        if (attachmentPath.test(r.url()) && r.method() === 'POST') saves += 1;
      });
      await openConversation(page);
      await attach(page, 'Ospite.pdf', twoPagePdf());
      await expect(chip(page, 'Ospite.pdf')).toContainText(labels.status.ready);
      await page.locator('textarea').fill('Quando apre l’osservatorio?');
      await page.locator('textarea').press('Enter');
      await expect.poll(() => sent.length).toBe(1);
      expect(sent[0].attachments?.[0].pages).toEqual([
        { pageNumber: 1, text: 'The fictional observatory opened in 1847.' },
        { pageNumber: 2, text: 'The fictional telescope has a violet lens.' },
      ]);
      expect(saves).toBe(0);
      // Scanned pages need an account: the real server refuses, and the student is told why.
      await attach(page, 'Scansione ospite.pdf', drawingOnlyPdf(1), { firstFile: false });
      const scanned = chip(page, 'Scansione ospite.pdf');
      await expect(scanned).toContainText(labels.errors.ocrNeedsAccount);
      await expect(
        scanned.getByRole('button', {
          name: labels.retryLabel.replace('{name}', 'Scansione ospite.pdf'),
        }),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
