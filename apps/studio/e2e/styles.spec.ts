import { expect, test } from '@playwright/test';
import {
  goTo,
  importStyles,
  open,
  option,
  saveStyle,
  settled,
  showInGallery,
  signatureHtml,
  storedState,
  storedStyles,
} from './helpers.ts';

const IMPORTED = { name: 'Imported', s: { template: 'tiles', theme: 'azure', photoShape: 'arch' } };

test.beforeEach(async ({ page }) => {
  await open(page);
});

/** Sets a look worth saving: a hexagon photo in duotone on a transparent background. */
async function setLook(page: Parameters<typeof goTo>[0]): Promise<void> {
  await goTo(page, 'photo');
  await option(page, 'shape-picker', 'hexagon').click();
  await option(page, 'seg-look', 'duotone').click();
  await goTo(page, 'layout');
  await option(page, 'seg-bg', 'transparent').click();
}

test('save as my style keeps the look but not your details', async ({ page }) => {
  await setLook(page);
  await saveStyle(page, 'Test style');
  await expect(page.getByTestId('gallery-filter')).toHaveValue('mine');
  const mine = page.getByTestId('gallery').locator('[data-kind="mine"]');
  await expect(mine).toHaveCount(1);
  await expect(mine).toHaveAttribute('aria-pressed', 'true');

  const styles = await storedStyles(page);
  expect(styles).toHaveLength(1);
  expect(styles[0]?.name).toBe('Test style');
  expect(styles[0]?.s).toMatchObject({ photoShape: 'hexagon', photoLook: 'duotone', bgMode: 'transparent' });
  for (const personal of ['fullName', 'email', 'phone', 'photo', 'logo'])
    expect(styles[0]?.s).not.toHaveProperty(personal);
});

test('the built-in styles are listed, and one applies its look', async ({ page }) => {
  await showInGallery(page, 'presets');
  await expect(page.getByTestId('gallery').locator('[data-kind="preset"]')).toHaveCount(18);

  await page.getByTestId('design-p-midnight-exec').click();
  await expect(page.getByTestId('toast').filter({ hasText: 'applied' })).toBeVisible();
  await settled(page);
  expect(await storedState(page)).toMatchObject({
    template: 'executive',
    bgMode: 'solid',
    bgColor: '#0B1F3A',
    cols: 2,
  });
  expect((await signatureHtml(page)).toUpperCase()).toContain('#0B1F3A');
  await expect(page.getByTestId('weight')).toContainText('Executive');
});

test('applying my style brings its look back', async ({ page }) => {
  await setLook(page);
  await saveStyle(page, 'Test style');
  await showInGallery(page, 'presets');
  await page.getByTestId('design-p-midnight-exec').click();
  await settled(page);
  expect(await storedState(page)).toMatchObject({ photoShape: 'circle', photoLook: 'natural', bgMode: 'solid' });

  await showInGallery(page, 'mine');
  await page.getByTestId('gallery').locator('[data-kind="mine"]').click();
  await expect(page.getByTestId('toast').filter({ hasText: 'Test style applied' })).toBeVisible();
  await settled(page);
  expect(await storedState(page)).toMatchObject({ photoShape: 'hexagon', photoLook: 'duotone', bgMode: 'transparent' });
});

test('styles import from a file, and delete', async ({ page }) => {
  await saveStyle(page, 'Test style');
  await importStyles(page, [IMPORTED]);
  await expect(page.getByTestId('toast').filter({ hasText: 'Imported 1 style.' })).toBeVisible();
  const mine = page.getByTestId('gallery').locator('[data-kind="mine"]');
  await expect(mine).toHaveCount(2);
  const styles = await storedStyles(page);
  expect(styles.map((m) => m.name)).toEqual(['Test style', 'Imported']);
  expect(styles[1]?.s).toMatchObject({
    template: 'tiles',
    colors: ['#0067B8', '#0094F0', '#50E6FF'],
    gradient: true,
    photoShape: 'arch',
  });

  await page.getByRole('button', { name: 'Delete Imported' }).click();
  await expect(page.getByTestId('toast').filter({ hasText: 'Deleted “Imported”' })).toBeVisible();
  await expect(mine).toHaveCount(1);
  expect((await storedStyles(page)).map((m) => m.name)).toEqual(['Test style']);
});

test('shuffle makes a new mix', async ({ page }) => {
  await page.getByTestId('shuffle').click();
  const toast = page.getByTestId('toast').filter({ hasText: 'New mix' });
  await expect(toast).toBeVisible();
  const name = /New mix: (.+?)\. /.exec(await toast.innerText())?.[1];
  expect(name).toBeTruthy();
  await settled(page);
  await expect(page.getByTestId('weight')).toContainText(`${name} ·`);
});
