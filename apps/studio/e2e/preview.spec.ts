import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { parse } from 'yaml';
import {
  builtCount,
  fixture,
  goTo,
  open,
  openFile,
  option,
  settled,
  shadowText,
  showInGallery,
  signature,
  signatureHtml,
  storedState,
} from './helpers.ts';

const REPLY_STYLES = ['line', 'two', 'bar', 'card', 'name', 'design'];
const GROUPS = ['Microsoft and tech', 'Classic and calm', 'Nature', 'Warm', 'Rich'];

async function pickTheme(page: Page, name: string): Promise<void> {
  const picker = page.getByRole('combobox', { name: 'Colour theme', exact: true });
  await picker.click();
  await page.getByRole('option', { name, exact: true }).click();
  await expect(picker).toHaveText(name);
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
}

test.beforeEach(async ({ page }) => {
  await open(page);
});

const designIds = (page: Page): Promise<string[]> =>
  page
    .getByTestId('gallery')
    .locator('[data-kind="tpl"]')
    .evaluateAll((cards) => cards.map((c) => (c.getAttribute('data-testid') ?? '').replace(/^design-/, '')));

test('one grouped filter shows collections, roles and nine industries', async ({ page }) => {
  const industry = page.getByRole('combobox', { name: 'Show', exact: true });
  await expect(industry.locator('optgroup')).toHaveCount(3);
  await expect(industry.locator('optgroup[label="Industries"] option')).toHaveCount(9);
  await expect(industry.locator('optgroup[label="Collections"] option')).toHaveText([
    'All designs',
    'Featured',
    'Styles',
    'My styles (0)',
  ]);
  for (const [id, expected] of [
    ['finance', ['ledger', 'adviser']],
    ['healthcare', ['care']],
    ['technology', ['systems', 'circuit']],
  ] as const) {
    await industry.selectOption(id);
    await expect.poll(() => designIds(page)).toEqual([...expected]);
  }
  await page.reload();
  await settled(page);
  await expect(industry).toHaveValue('technology');
  await page.getByTestId('design-circuit').click();
  await settled(page);
  expect((await storedState(page)).template).toBe('circuit');
  await industry.selectOption('all');
  await expect.poll(() => designIds(page)).toHaveLength(36);
});

test('all industry layouts build in Compare with a handwritten name and larger custom typography', async ({ page }) => {
  await goTo(page, 'name');
  await page.getByRole('combobox', { name: 'Font for typed text' }).selectOption('georgia');
  await option(page, 'seg-text-size', 'large').click();
  await option(page, 'seg-name-style', 'hand').click();
  await goTo(page, 'design');
  const ids = [
    'ledger',
    'adviser',
    'counsel',
    'care',
    'faculty',
    'blueprint',
    'folio',
    'studio-card',
    'concierge',
    'community',
    'systems',
    'circuit',
  ];
  for (const id of ids) await page.getByTestId(`pick-${id}`).check();
  await page.getByTestId('compare-picked').click();
  for (const id of ids) {
    const card = page.getByTestId(`compare-${id}`);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => builtCount(card), { message: id }).toBe(2);
  }
});

test('compare all shows every design, new message and reply', async ({ page }) => {
  const ids = await designIds(page);
  expect(ids).toHaveLength(36);
  await page.getByTestId('compare-all').click();
  await expect(option(page, 'seg-mode', 'compare')).toHaveAttribute('aria-pressed', 'true');
  const cards = page.getByTestId('compare-view').locator('article');
  await expect(cards).toHaveCount(ids.length);
  // Cards build when they scroll into view.
  for (const id of ids) {
    const card = page.getByTestId(`compare-${id}`);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => builtCount(card), { message: id }).toBe(2);
  }

  await page.getByTestId('compare-terminal').getByRole('button', { name: 'Use Terminal' }).click();
  await expect(page.getByTestId('toast').filter({ hasText: 'Terminal selected.' })).toBeVisible();
  await expect(option(page, 'seg-mode', 'single')).toHaveAttribute('aria-pressed', 'true');
  await settled(page);
  expect((await storedState(page)).template).toBe('terminal');
});

test('picked designs and styles show on their own in Compare, until the picks are cleared', async ({ page }) => {
  const gallery = page.getByTestId('gallery');
  await expect(page.getByTestId('compare-picked')).toHaveCount(0);
  await page.getByTestId('pick-terminal').check();
  await showInGallery(page, 'presets');
  const preset = gallery.locator('[data-kind="preset"]').first();
  const presetId = ((await preset.getAttribute('data-testid')) ?? '').replace(/^design-/, '');
  await page.getByTestId(`pick-${presetId}`).check();
  await expect(page.getByTestId('pick-terminal')).toHaveCount(0);

  // Picks are kept between visits.
  await page.reload();
  await settled(page);
  await expect(page.getByTestId('compare-picked')).toHaveText('Compare 2 picked');
  await page.getByTestId('compare-picked').click();
  await expect(option(page, 'seg-mode', 'compare')).toHaveAttribute('aria-pressed', 'true');
  const cards = page.getByTestId('compare-view').locator('article');
  await expect(cards).toHaveCount(2);
  await expect(page.getByTestId('compare-count')).toHaveText('Comparing 2');
  await expect(page.getByTestId('compare-terminal')).toBeVisible();
  await expect(page.getByTestId(`compare-${presetId}`)).toBeVisible();
  await expect(page.getByTestId('compare-pick-terminal')).toBeChecked();
  for (const card of await cards.all()) await expect.poll(() => builtCount(card)).toBe(2);

  const presets = await gallery.locator('[data-kind="preset"]').count();
  await page.getByTestId('compare-show-all').click();
  await expect(cards).toHaveCount(presets);
  await expect(page.getByTestId('compare-count')).toHaveText('2 picked');
  await page.getByTestId('compare-show-picked').click();
  await expect(cards).toHaveCount(2);

  await page.getByTestId('compare-clear').click();
  await expect(page.getByTestId('compare-picks')).toHaveCount(0);
  await expect(cards).toHaveCount(presets);
  await showInGallery(page, 'all');
  await expect(cards).toHaveCount(36);
});

test('the compact theme selector opens grouped palettes only when needed', async ({ page }) => {
  await goTo(page, 'layout');
  const before = await storedState(page);
  const picker = page.getByRole('combobox', { name: 'Colour theme', exact: true });
  await expect(picker).toHaveText('Aurora');
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  expect(await picker.evaluate((el) => el.getBoundingClientRect().height)).toBeLessThanOrEqual(40);

  await picker.click();
  const list = page.getByRole('listbox');
  const options = list.getByRole('option');
  await expect(options).toHaveCount(33);
  await expect(list.getByRole('group')).toHaveCount(GROUPS.length);
  for (const group of GROUPS) await expect(list.getByRole('group', { name: group, exact: true })).toBeAttached();
  await expect(page.getByTestId('color-settings')).toBeVisible();
  await expect(list.getByRole('option', { name: 'Aurora', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect(await list.evaluate((el) => el.getBoundingClientRect().height)).toBeLessThanOrEqual(320);

  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(picker).toBeFocused();
  expect(await storedState(page)).toEqual(before);
});

for (const width of [1440, 343]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`themes support keyboard selection at ${width}px in ${colorScheme} mode`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme });
      await goTo(page, 'layout');
      const picker = page.getByRole('combobox', { name: 'Colour theme', exact: true });
      await picker.scrollIntoViewIfNeeded();
      await picker.press('ArrowDown');
      const list = page.getByRole('listbox');
      await expect(list).toBeInViewport({ ratio: 1 });
      // Focus moves into the list, so type to it rather than the trigger.
      await page.keyboard.type('olive');
      await page.keyboard.press('Enter');
      await expect(picker).toHaveText('Olive');
      await expect(list).toBeHidden();
      expect(await storedState(page)).toMatchObject({ colors: ['#414B25', '#77813C', '#A69A54'], gradient: true });

      await picker.press('ArrowDown');
      await expect(list).toBeVisible();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Escape');
      await expect(picker).toBeFocused();
      await expect(picker).toHaveText('Olive');
      expect(await storedState(page)).toMatchObject({ colors: ['#414B25', '#77813C', '#A69A54'], gradient: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    });
  }
}

for (const { name, colors } of [
  { name: 'Emerald & Gold', colors: ['#004D40', '#008568', '#C9A64C'] },
  { name: 'Midnight', colors: ['#0B1220', '#243B53', '#487C8C'] },
  { name: 'Indigo', colors: ['#312E81', '#4F46E5'] },
  { name: 'Terracotta', colors: ['#7F3B2D', '#B86548', '#C58B68'] },
  { name: 'Olive', colors: ['#414B25', '#77813C', '#A69A54'] },
  { name: 'Rose', colors: ['#793B58', '#AD587A', '#C98A9C'] },
  { name: 'Noir', colors: ['#000000', '#3D3D3D'] },
]) {
  test(`${name} can be picked, saved and opened again`, async ({ page }) => {
    await goTo(page, 'layout');
    const before = await signatureHtml(page);
    const picker = page.getByRole('combobox', { name: 'Colour theme', exact: true });
    await pickTheme(page, name);
    await settled(page);
    expect(await signatureHtml(page)).not.toBe(before);
    expect(await storedState(page)).toMatchObject({ colors, gradient: true });

    await page.reload();
    await settled(page);
    await expect(picker).toHaveText(name);
    expect(await storedState(page)).toMatchObject({ colors, gradient: true });

    const download = page.waitForEvent('download');
    await page.getByTestId('save-file').click();
    const file = await download;
    const text = await readFile(await file.path(), 'utf8');
    expect(parse(text)).toMatchObject({ signature: 2, style: { colors, gradient: true } });
    expect(parse(text).style).not.toHaveProperty('theme');

    await pickTheme(page, 'Aurora');
    await settled(page);
    await openFile(page, {
      name: file.suggestedFilename(),
      mimeType: 'application/yaml',
      buffer: Buffer.from(text),
    });
    await expect.poll(async () => (await storedState(page)).colors).toEqual(colors);
    await expect(picker).toHaveText(name);
    await settled(page);
    expect(await signatureHtml(page)).not.toBe(before);
  });
}

test('your own colours make a palette, and a logo suggests colours', async ({ page }) => {
  await goTo(page, 'layout');
  const picker = page.getByRole('combobox', { name: 'Colour theme', exact: true });
  const panel = page.getByTestId('color-settings');
  await expect(panel).toBeVisible();
  await expect(picker).toHaveText('Aurora');
  await panel.getByRole('button', { name: 'Colours from a logo or image' }).click();

  await settled(page);
  const before = await signatureHtml(page);
  // The colour button opens a palette: one click on a named colour, or any colour by hex code.
  await panel.getByTestId('color-1').click();
  const popover = page.getByTestId('color-1-popover');
  await popover.getByRole('radio', { name: 'Teal, #038387' }).click();
  await expect.poll(async () => (await storedState(page)).colors[0]).toBe('#038387');
  await popover.getByTestId('color-1-hex').fill('ff6a00');
  await expect.poll(async () => (await storedState(page)).colors[0]).toBe('#FF6A00');
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
  await expect(panel.getByTestId('color-1')).toBeFocused();
  await expect(panel.getByTestId('color-1')).toHaveAccessibleName('Colour 1: #FF6A00');
  await expect(picker).toHaveText('Custom');
  expect((await storedState(page)).colors.slice(1)).toEqual(['#7160E8', '#C239B3']);
  // Orange is too light for text on white, so the text uses a deeper shade.
  await expect(panel).toContainText('a deeper shade of #FF6A00');
  await settled(page);
  expect(await signatureHtml(page)).not.toBe(before);

  while ((await panel.getByRole('button', { name: /^Remove colour/ }).count()) > 0)
    await panel
      .getByRole('button', { name: /^Remove colour/ })
      .first()
      .click();
  await expect(panel.getByRole('switch', { name: 'Gradient', exact: true })).toBeDisabled();
  await panel.getByTestId('color-add').click();
  await expect.poll(async () => (await storedState(page)).colors.length).toBe(2);

  // An image only lends its colours. It does not become the logo.
  await panel.getByTestId('colors-file').setInputFiles(fixture('logo.png'));
  await expect(panel).toContainText('The image is not added to your signature.');
  await expect(panel.getByTestId('logo-colors-1')).toBeVisible();
  expect((await storedState(page)).logo.src).toBeFalsy();

  await goTo(page, 'photo');
  await page.getByTestId('logo-file').setInputFiles(fixture('logo.png'));
  await expect(page.getByTestId('logo-preview')).toBeVisible();
  await goTo(page, 'layout');
  await panel.getByRole('button', { name: 'Colours from a logo or image' }).click();
  await panel.getByTestId('logo-colors-1').click();
  const st = await storedState(page);
  expect(st.colors).toHaveLength(1);
  expect(st.colors[0]).toMatch(/^#[0-9A-F]{6}$/);
  expect(st.gradient).toBe(false);
  await expect(panel).toContainText('Colours found in your company logo.');
  // The logo's colours are offered in each colour's palette too.
  await panel.getByTestId('color-1').click();
  await expect(page.getByTestId('color-1-popover')).toContainText('From your logo');
  await expect(page.getByTestId('color-1-popover').getByRole('radio', { name: /^Logo colour 1/ })).toHaveCount(1);
  await page.keyboard.press('Escape');

  await pickTheme(page, 'Navy');
  await expect(panel).toBeVisible();
  expect(await storedState(page)).toMatchObject({ colors: ['#13294B', '#1B3A6B', '#2F5597'], gradient: true });
});

test('presets prefill every colour; edits become Custom without changing background or icon settings', async ({
  page,
}) => {
  await goTo(page, 'layout');
  await option(page, 'seg-bg', 'solid').click();
  await option(page, 'bg-picker', '#FFFFFF').click();
  await goTo(page, 'icons');
  await option(page, 'seg-icon-color', 'neutral').click();
  await goTo(page, 'layout');
  await pickTheme(page, 'Copilot Spectrum');
  const picker = page.getByRole('combobox', { name: 'Colour theme', exact: true });
  const panel = page.getByTestId('color-settings');
  const gradient = panel.getByRole('switch', { name: 'Gradient', exact: true });
  const preset = { colors: ['#2D7FF9', '#8B5CF6', '#E5508A', '#F9A23C'], gradient: true };
  for (const [i, color] of preset.colors.entries())
    await expect(panel.getByTestId(`color-${i + 1}`)).toHaveAccessibleName(`Colour ${i + 1}: ${color}`);
  await expect(panel.getByTestId('color-add')).toHaveCount(0);
  await expect(gradient).toBeChecked();
  await settled(page);
  const before = await signatureHtml(page);

  await gradient.uncheck();
  await expect(picker).toHaveText('Custom');
  await settled(page);
  expect(await signatureHtml(page)).not.toBe(before);
  expect(await storedState(page)).toMatchObject({
    colors: preset.colors,
    gradient: false,
    bgMode: 'solid',
    bgColor: '#FFFFFF',
    iconColor: 'neutral',
  });
  await page.reload();
  await settled(page);
  await expect(picker).toHaveText('Custom');
  await expect(gradient).not.toBeChecked();

  await gradient.check();
  await expect(picker).toHaveText('Copilot Spectrum');
  await panel.getByRole('button', { name: 'Remove colour 4', exact: true }).click();
  await expect(picker).toHaveText('Custom');
  expect((await storedState(page)).colors).toEqual(preset.colors.slice(0, 3));
  await pickTheme(page, 'Copilot Spectrum');
  expect(await storedState(page)).toMatchObject({
    ...preset,
    bgMode: 'solid',
    bgColor: '#FFFFFF',
    iconColor: 'neutral',
  });
});

test('a background card can be any colour, picked from light and dark cards', async ({ page }) => {
  await goTo(page, 'layout');
  await option(page, 'seg-bg', 'solid').click();
  const custom = page.getByTestId('bg-custom');
  await custom.click();
  const popover = page.getByTestId('bg-custom-popover');
  await expect(popover).toContainText('Light cards');
  await expect(popover).toContainText('Dark cards');
  await popover.getByRole('radio', { name: 'Forest, #0F2A1E' }).click();
  await expect.poll(async () => (await storedState(page)).bgColor).toBe('#0F2A1E');
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
  await expect(custom).toHaveAccessibleName('Custom background colour: Forest, #0F2A1E');
  await expect(page.getByTestId('bg-picker').getByRole('radio', { checked: true })).toHaveCount(0);
  await settled(page);
  expect(await signatureHtml(page)).toContain('#0F2A1E');
});

test('the reply picker shows a live preview of all six versions', async ({ page }) => {
  await goTo(page, 'reply');
  await expect(option(page, 'seg-version', 'reply')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('reply-picker').getByRole('radio')).toHaveCount(6);
  for (const id of REPLY_STYLES) {
    await expect.poll(() => builtCount(page.getByTestId(`reply-preview-${id}`)), { message: id }).toBe(1);
  }
});

test('picking a reply version shows it in the preview', async ({ page }) => {
  await goTo(page, 'reply');
  for (const [id, name] of [
    ['two', 'Two lines'],
    ['name', 'Name only'],
  ] as const) {
    const radio = page.getByTestId('reply-picker').getByRole('radio', { name });
    await radio.check();
    await expect(radio).toBeChecked();
    await settled(page);
    expect((await storedState(page)).replyStyle).toBe(id);
    await expect(option(page, 'seg-version', 'reply')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('weight')).toContainText('Reply');
    const card = page.getByTestId(`reply-preview-${id}`);
    await expect.poll(() => builtCount(card)).toBe(1);
    await expect.poll(() => shadowText(signature(page))).toBe(await shadowText(card));
  }
});
