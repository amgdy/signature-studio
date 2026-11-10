import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { parse } from 'yaml';
import {
  builtCount,
  fixture,
  goTo,
  importStyles,
  open,
  openFile,
  option,
  pickDesign,
  settled,
  signature,
  signatureHtml,
  startOver,
  storedState,
  storedStyles,
} from './helpers.ts';

test('a first visit starts with a made-up person, and a reload keeps them', async ({ page }) => {
  await page.goto('/');
  await settled(page);
  const first = await storedState(page);
  expect(first.fullName).not.toBe('');
  expect(first.fullName).not.toBe('Sam Taylor');
  await expect(signature(page)).toContainText(first.fullName);
  expect(await signatureHtml(page)).toContain('555');
  await page.reload();
  await settled(page);
  expect((await storedState(page)).fullName).toBe(first.fullName);
});

test('save signature file writes readable YAML with base64 images, and it opens again', async ({ page }) => {
  await open(page);
  await goTo(page, 'photo');
  await page.getByTestId('logo-file').setInputFiles(fixture('logo.png'));
  await expect(page.getByTestId('logo-preview')).toBeVisible();
  await goTo(page, 'photo');
  await page.getByTestId('photo-file').setInputFiles(fixture('logo.png'));
  await expect.poll(async () => (await storedState(page)).photo.src).toMatch(/^data:image\/jpeg;base64,/);
  await settled(page);

  const download = page.waitForEvent('download');
  await page.getByTestId('save-file').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('sam-taylor.signature.yaml');
  const text = await readFile(await file.path(), 'utf8');
  expect(text.startsWith('# Signature Studio signature file.\n')).toBe(true);
  for (const group of ['details', 'contact', 'extras', 'show', 'style', 'images'])
    expect(text).toMatch(new RegExp(`\\n${group}:\\n`));
  expect(parse(text)).toMatchObject({
    signature: 2,
    details: { fullName: 'Sam Taylor', company: 'Contoso' },
    contact: { email: 'sam.taylor@contoso.com' },
    extras: { quoteBy: '' },
    show: { photo: true, logo: true },
    style: { template: 'aurora', optimize: true },
    images: { photo: { type: 'image/jpeg', zoom: 1 }, logo: { type: 'image/png' } },
  });
  const base64 = text.split('\n').filter((l) => /^ {6}[A-Za-z0-9+/=]+$/.test(l));
  expect(base64.length).toBeGreaterThan(10);
  for (const line of base64) expect(line.trim().length).toBeLessThanOrEqual(76);
  const logo: string = parse(text).images.logo.data;
  expect(Buffer.from(logo.replace(/\s+/g, ''), 'base64').subarray(1, 4).toString()).toBe('PNG');

  await startOver(page, 'new-blank');
  await expect(signature(page)).not.toContainText('Sam Taylor');
  await openFile(page, { name: file.suggestedFilename(), mimeType: 'application/yaml', buffer: Buffer.from(text) });
  await expect(
    page.getByTestId('toast').filter({ hasText: 'Opened sam-taylor.signature.yaml: Aurora.' }),
  ).toBeVisible();
  await expect(signature(page)).toContainText('Sam Taylor');
  const back = await storedState(page);
  expect(back.photo.src).toMatch(/^data:image\/jpeg;base64,/);
  expect(back.logo.src).toMatch(/^data:image\/png;base64,/);
  expect(back.show).toMatchObject({ photo: true, logo: true });
});

test('a hand-written YAML signature file opens', async ({ page }) => {
  await open(page);
  await openFile(page, fixture('sample.signature.yaml'));
  await expect(page.getByTestId('toast').filter({ hasText: 'Opened sample.signature.yaml: Executive.' })).toBeVisible();
  await expect(signature(page)).toContainText('Riley Sample');
  await expect(page.getByTestId('weight')).toContainText('Executive');
  const s = await storedState(page);
  expect(s).toMatchObject({
    template: 'executive',
    colors: ['#005B96', '#00787F'],
    gradient: true,
    cols: 2,
    show: { logo: true },
  });
  expect(s.logo.src).toMatch(/^data:image\/png;base64,iVBOR/);
  // Text the file leaves out is empty, not the details you had.
  await expect(signature(page)).not.toContainText('Sam Taylor');
});

test('a file that is not a signature file is refused with a message, from the Files section', async ({ page }) => {
  await open(page);
  await goTo(page, 'files');
  await openFile(
    page,
    { name: 'notes.yaml', mimeType: 'application/yaml', buffer: Buffer.from('hello: 1\n') },
    'files-open-file',
  );
  await expect(page.getByTestId('toast').first()).toContainText('not a Signature Studio signature file');
  await expect(signature(page)).toContainText('Sam Taylor');
});

test('dropping a signature file on the Studio opens it', async ({ page }) => {
  await open(page);
  const text = await readFile(fixture('sample.signature.yaml'), 'utf8');
  await page.getByTestId('preview').evaluate((el, yaml) => {
    const data = new DataTransfer();
    data.items.add(new File([yaml], 'dropped.signature.yaml', { type: 'application/yaml' }));
    for (const type of ['dragover', 'drop'])
      el.dispatchEvent(new DragEvent(type, { dataTransfer: data, bubbles: true, cancelable: true }));
  }, text);
  await expect(signature(page)).toContainText('Riley Sample');
});

test('a new blank signature clears details, photo and logo, and resets the settings', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const w = await open(page);
  await importStyles(page, [{ name: 'Kept', s: { template: 'tiles' } }]);
  await pickDesign(page, 'executive');
  await goTo(page, 'layout');
  await option(page, 'seg-columns', '3').click();
  await settled(page);

  // Cancel leaves everything as it was.
  await page.getByTestId('start-over').click();
  await page.getByTestId('new-blank').click();
  const dialog = page.getByTestId('start-over-dialog');
  await expect(dialog).toContainText('Start a blank signature?');
  await expect(dialog).toContainText('Your saved styles stay.');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(signature(page)).toContainText('Sam Taylor');

  await startOver(page, 'new-blank');
  await expect(page.getByTestId('toast').filter({ hasText: 'Blank signature ready.' })).toBeVisible();
  await expect(page.getByTestId('pane-details')).toBeVisible();
  await expect(page.getByTestId('empty-hint')).toContainText('Add your name in Details to see your signature.');
  await settled(page);
  const html = await signatureHtml(page);
  expect(html).not.toContain('Sam Taylor');
  expect(html).not.toContain('Photo of');
  const s = await storedState(page);
  expect(s).toMatchObject({ fullName: '', template: 'aurora', cols: 'auto', show: { photo: false, logo: false } });
  expect(s.photo.src).toBe('');
  expect((await storedStyles(page)).map((m) => m.name)).toEqual(['Kept']);

  // Everything else keeps working with no details.
  await expect(page.getByTestId('a11y-readout')).toContainText('Accessibility');
  await page.getByTestId('copy-signature').click();
  await expect(page.getByTestId('toast').filter({ hasText: 'copied' })).toBeVisible();
  await goTo(page, 'check');
  await expect(page.getByTestId('a11y-list')).toBeVisible();
  await option(page, 'seg-mode', 'compare').click();
  const card = page.getByTestId('compare-aurora');
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => builtCount(card)).toBe(2);
  await option(page, 'seg-mode', 'single').click();

  // The hint takes you to Details, and a new photo turns the photo back on.
  await page.getByTestId('empty-hint').getByRole('button', { name: 'Open Details' }).click();
  await expect(page.getByTestId('pane-details')).toBeVisible();
  await goTo(page, 'photo');
  await page.getByTestId('photo-file').setInputFiles(fixture('logo.png'));
  await expect.poll(async () => (await storedState(page)).show['photo']).toBe(true);
  expect(w.problems).toEqual([]);
});

test('try a random sample changes the person, resets the settings and keeps saved styles', async ({ page }) => {
  await open(page);
  await importStyles(page, [{ name: 'Kept', s: { template: 'tiles' } }]);
  await pickDesign(page, 'terminal');
  await goTo(page, 'files');
  await page.getByTestId('files-random-sample').click();
  await expect(page.getByTestId('start-over-dialog')).toContainText('Try a random sample?');
  await page.getByTestId('confirm-start').click();
  const toast = page.getByTestId('toast').filter({ hasText: 'Sample person:' });
  await expect(toast).toBeVisible();
  const name = /Sample person: (.+?)\. /.exec(await toast.innerText())?.[1] ?? '';
  expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  await expect(signature(page)).toContainText(name);
  await expect(signature(page)).not.toContainText('Sam Taylor');
  const s = await storedState(page);
  expect(s).toMatchObject({ fullName: name, template: 'aurora', altName: '' });
  expect((await storedStyles(page)).map((m) => m.name)).toEqual(['Kept']);
});

test('reset everything returns to a first visit and deletes saved styles after a warning', async ({ page }) => {
  const w = await open(page);
  await importStyles(page, [
    { name: 'One', s: { template: 'tiles' } },
    { name: 'Two', s: { template: 'terminal' } },
  ]);
  await pickDesign(page, 'executive');
  await page.getByTestId('pick-executive').check();
  await page.getByTestId('app-appearance').click();
  await page.getByTestId('appearance-dark').click();
  await page.keyboard.press('Escape');
  await goTo(page, 'files');

  // Cancel keeps everything.
  await page.getByTestId('files-reset-everything').click();
  const dialog = page.getByTestId('start-over-dialog');
  await expect(dialog).toContainText('Reset everything?');
  await expect(dialog).toContainText('It also deletes your 2 saved styles');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  expect(await storedStyles(page)).toHaveLength(2);

  await page.getByTestId('start-over').click();
  await page.getByTestId('reset-everything').click();
  await page.getByTestId('confirm-start').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('toast').filter({ hasText: 'Everything is reset.' })).toBeVisible();
  await expect(page.getByTestId('pane-details')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-app-theme', 'dark');
  await settled(page);
  await expect(signature(page)).not.toContainText('Sam Taylor');
  expect(await storedStyles(page)).toEqual([]);
  const s = await storedState(page);
  expect(s).toMatchObject({ template: 'aurora', cols: 'auto' });
  expect(s.fullName).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  const ui = await page.evaluate(() => JSON.parse(localStorage.getItem('signature-studio.ui.v5') ?? '{}').state);
  expect(ui).toMatchObject({ pane: 'details', appTheme: 'auto', filter: 'all', picks: [] });
  expect(w.problems).toEqual([]);
});

test('the Use section copies the new-message and reply signatures', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  await goTo(page, 'files');
  await page.getByTestId('files-copy-new').click();
  await expect(page.getByTestId('toast').filter({ hasText: 'Signature copied.' })).toBeVisible();
  const full = await page.evaluate(() => navigator.clipboard.readText());
  await page.getByTestId('files-copy-reply').click();
  await expect(page.getByTestId('toast').filter({ hasText: 'Reply signature copied.' })).toBeVisible();
  const reply = await page.evaluate(() => navigator.clipboard.readText());
  expect(full).toContain('Sam Taylor');
  expect(reply).toContain('Sam Taylor');
  expect(reply.length).toBeLessThan(full.length);
});
