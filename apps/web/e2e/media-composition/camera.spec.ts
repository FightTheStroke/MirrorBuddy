import { test, expect } from './fixtures';
import { decodedPixels, installCamera, knownImage } from './hardware';
import messages from '../../messages/it/tools.json';
import type { FileChooser } from '@playwright/test';

const text = messages.tools;
const entry = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: new RegExp(text.webcamStandalone.label, 'i') });

for (const source of ['camera', 'gallery'] as const) {
  test(`${source}: real capture, confirm, persistence, reload and archive reopen`, async ({
    media,
  }) => {
    const { page, prisma, userId } = media;
    await installCamera(page, source === 'camera' ? 'supported' : 'unsupported');
    await entry(page).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    if (source === 'camera') {
      const capture = dialog.getByRole('button', { name: text.webcam.takePhoto, exact: true });
      await expect(capture).toBeEnabled();
      await capture.click();
      await expect(dialog.getByRole('img', { name: text.webcam.fotoCatturata })).toBeVisible();
      expect(await decodedPixels(page, '[role="dialog"] img')).toMatchObject({
        width: 160,
        height: 120,
        nonzero: true,
      });
      await dialog.getByRole('button', { name: text.webcam.retake, exact: true }).click();
      await expect(capture).toBeEnabled();
      await capture.click();
    } else {
      const choose = dialog.getByRole('button', { name: text.webcam.choosePhoto });
      await expect(choose).toBeVisible();
      await choose.focus();
      const selected = page.waitForEvent('filechooser');
      await choose.press('Enter');
      await (await selected).setFiles(await knownImage(page));
      await expect(dialog.getByRole('img', { name: text.webcam.fotoCatturata })).toBeVisible();
      expect(await decodedPixels(page, '[role="dialog"] img')).toMatchObject({
        width: 48,
        height: 32,
        nonzero: true,
      });
    }
    await expect(dialog.getByRole('status')).toHaveText(text.webcam.fotoCatturata);
    const preview = await dialog.getByRole('img').getAttribute('src');
    let posts = 0;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/materials' && request.method() === 'POST')
        posts++;
    });
    const save = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/materials' &&
        response.request().method() === 'POST',
    );
    const confirm = dialog.getByRole('button', { name: text.webcam.confirm, exact: true });
    await confirm.focus();
    await expect(confirm).toBeFocused();
    await confirm.press('Enter');
    expect((await save).ok()).toBe(true);
    await expect(dialog).toBeHidden();
    await expect(entry(page)).toBeFocused();
    expect(posts).toBe(1);
    const rows = await prisma.material.findMany({ where: { userId, toolType: 'webcam' } });
    expect(rows).toHaveLength(1);
    const content = JSON.parse(rows[0].content);
    expect(content.imageBase64).toBe(preview);
    const read = await page.request.get(`/api/materials/${rows[0].toolId}`);
    expect(read.ok()).toBe(true);
    expect((await read.json()).material.content.imageBase64).toBe(preview);
    await test.info().attach('owned-persistence-before-archive', {
      body: JSON.stringify({
        source,
        userId,
        materialId: rows[0].id,
        toolId: rows[0].toolId,
        posts,
        decodedNonzeroPixels: true,
        exactStoredImage: true,
        exactReadbackImage: true,
      }),
      contentType: 'application/json',
    });
    await page.reload();
    await page.goto('/it/supporti');
    await page.getByText(rows[0].title, { exact: true }).first().click();
    const viewer = page.locator('.fixed.inset-0.z-50').filter({
      has: page.getByRole('heading', { name: rows[0].title, level: 2, exact: true }),
    });
    await expect(viewer.getByRole('img')).toHaveAttribute('src', preview!);
    expect(await decodedPixels(page, '.fixed.inset-0.z-50 img')).toMatchObject({
      width: source === 'camera' ? 160 : 48,
      height: source === 'camera' ? 120 : 32,
      nonzero: true,
    });
    await test.info().attach('owned-persistence', {
      body: JSON.stringify({
        source,
        userId,
        materialId: rows[0].id,
        toolId: rows[0].toolId,
        posts,
        decodedNonzeroPixels: true,
        exactStoredImage: true,
      }),
      contentType: 'application/json',
    });
  });
}

test('denial and picker cancellation preserve recovery controls and keyboard focus', async ({
  media,
}) => {
  const { page, prisma, userId } = media;
  await installCamera(page, 'denied');
  await entry(page).click();
  const dialog = page.getByRole('dialog');
  const choose = dialog.getByRole('button', { name: text.webcam.choosePhoto });
  await expect(choose).toBeVisible();
  await expect(dialog.getByRole('status')).not.toBeEmpty();
  await choose.focus();
  const picker = page.waitForEvent('filechooser');
  await choose.press('Enter');
  const input = (await picker).element();
  await input.evaluate((element) => element.dispatchEvent(new Event('cancel')));
  await expect(choose).toBeEnabled();
  await expect(choose).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect.soft(entry(page)).toBeFocused();
  await test.info().attach('focus-after-close', {
    body: JSON.stringify(
      await page.evaluate(() => ({
        activeTag: document.activeElement?.tagName,
        activeRole: document.activeElement?.getAttribute('role'),
      })),
    ),
    contentType: 'application/json',
  });
  expect(await prisma.material.count({ where: { userId } })).toBe(0);
  await entry(page).press('Enter');
  await expect(choose).toBeVisible();
  expect(await page.evaluate(() => window.c5Camera.calls)).toBe(2);
});

for (const pending of ['acquisition', 'import'] as const) {
  for (const exit of ['close', 'navigation'] as const) {
    test(`${exit} while ${pending} is pending prevents stale capture and permits reopen`, async ({
      media,
    }) => {
      const { page, prisma, userId } = media;
      await installCamera(page, pending === 'acquisition' ? 'pending' : 'unsupported');
      await entry(page).click();
      const dialog = page.getByRole('dialog');
      let picker: FileChooser | undefined;
      if (pending === 'import') {
        const selected = page.waitForEvent('filechooser');
        await dialog.getByRole('button', { name: text.webcam.choosePhoto }).click();
        picker = await selected;
      } else {
        await expect.poll(() => page.evaluate(() => window.c5Camera.calls)).toBe(1);
      }
      if (exit === 'navigation') {
        await page.goto('/it/supporti');
        expect(await prisma.material.count({ where: { userId } })).toBe(0);
        await page.goto('/it/astuccio');
      } else {
        if (picker)
          await dialog.getByRole('button', { name: text.webcam.closeCamera, exact: true }).click();
        else await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        if (picker) await picker.setFiles(await knownImage(page));
        else {
          await page.evaluate(() => window.c5Camera.grant());
          await expect.poll(() => page.evaluate(() => window.c5Camera.stops)).toBe(1);
        }
      }
      expect(await prisma.material.count({ where: { userId } })).toBe(0);
      await page.evaluate(() => {
        window.c5Camera.mode = 'supported';
      });
      await entry(page).click();
      await expect(
        dialog.getByRole('button', { name: text.webcam.takePhoto, exact: true }),
      ).toBeEnabled();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      expect(
        await page.evaluate(() =>
          window.c5Camera.streams.every((stream) =>
            stream.getTracks().every((track) => track.readyState === 'ended'),
          ),
        ),
      ).toBe(true);
    });
  }
}
