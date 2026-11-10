import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { apngPlays, goTo, open, option, photoSrc, pickDesign, settled, signatureHtml, storedState } from './helpers.ts';

/** How many of the images in `list` have finished drawing. */
const loaded = (list: Locator): Promise<number> =>
  list.evaluateAll(
    (imgs) => imgs.filter((i) => i instanceof HTMLImageElement && i.complete && i.naturalWidth > 0).length,
  );

test('drawing families change signatures, keep their choices, and offer grouped styles', async ({ page }) => {
  await goTo(page, 'icons');
  await expect(page.getByTestId('icon-family-picker').getByRole('radio')).toHaveCount(4);
  await page.getByLabel('Style group').selectOption('simple');
  await expect(page.getByTestId('icon-picker').getByRole('radio')).toHaveCount(6);
  await option(page, 'icon-picker', 'glyph').click();
  const outputs = new Set<string>();
  for (const family of ['standard', 'rounded', 'geometric', 'handdrawn']) {
    await option(page, 'icon-family-picker', family).click();
    await settled(page);
    expect((await storedState(page)).iconFamily).toBe(family);
    outputs.add(await signatureHtml(page));
  }
  expect(outputs.size).toBe(4);
  await page.reload();
  await settled(page);
  await expect(
    page.getByTestId('icon-family-picker').getByRole('radio', { name: 'Hand-drawn', exact: true }),
  ).toBeChecked();
});

test.beforeEach(async ({ page }) => {
  await open(page);
  // Aurora shows the photo, the contacts and the links.
  await pickDesign(page, 'aurora');
});

test('typography changes typed text and persists through reload', async ({ page }) => {
  await goTo(page, 'name');
  await page.getByLabel('Font for typed text', { exact: true }).selectOption('georgia');
  await option(page, 'seg-text-size', 'large').click();
  await settled(page);
  expect(await signatureHtml(page)).toContain('Georgia');
  expect(await storedState(page)).toMatchObject({ font: 'georgia', textSize: 'large' });
  await page.reload();
  await settled(page);
  await goTo(page, 'name');
  await expect(page.getByLabel('Font for typed text', { exact: true })).toHaveValue('georgia');
  await expect(option(page, 'seg-text-size', 'large')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('pane-name')).toContainText('Georgia fallback stack');
});

test('all ten handwriting previews load and the four new styles include offline licence terms', async ({ page }) => {
  await goTo(page, 'name');
  await option(page, 'seg-name-style', 'hand').click();
  const picker = page.getByTestId('hand-picker');
  await expect(picker.getByRole('radio')).toHaveCount(10);
  await expect.poll(() => loaded(picker.locator('img'))).toBe(10);
  for (const [label, id] of [
    ['Calligraphic', 'bird'],
    ['Looped', 'capitol'],
    ['Loose print', 'casualhand'],
    ['Neat print', 'readability'],
  ]) {
    await picker.getByRole('radio', { name: label, exact: true }).check();
    await settled(page);
    expect((await storedState(page)).handStyle).toBe(id);
  }
  await page.getByText('Font licences and credits', { exact: true }).click();
  await expect(page.getByTestId('pane-name')).toContainText('SIL OPEN FONT LICENSE Version 1.1');
  await expect(page.getByTestId('pane-name')).toContainText('Kimberly Geswein');
});

test('the icon picker shows seventeen styles drawn on light and dark, and text labels write Mobile', async ({
  page,
}) => {
  await goTo(page, 'icons');
  await page.getByLabel('Style group').selectOption('all');
  const picker = page.getByTestId('icon-picker');
  await expect(picker.locator('label[data-value]')).toHaveCount(17);
  // Fifteen styles draw icons, each with three samples on a light row and three on a dark row.
  await expect.poll(() => loaded(picker.locator('img'))).toBe(90);

  await option(page, 'icon-picker', 'labels').click();
  await expect(picker.getByRole('radio', { name: 'Text labels' })).toBeChecked();
  await settled(page);
  expect(await signatureHtml(page)).toMatch(/>Mobile</);
});

test('icon weight and colour change the icons in any style, and do nothing for text labels', async ({ page }) => {
  await goTo(page, 'icons');
  await page.getByLabel('Style group').selectOption('all');
  await option(page, 'icon-picker', 'circle').click();
  await settled(page);
  const before = await signatureHtml(page);

  await option(page, 'seg-icon-weight', 'line').click();
  await option(page, 'seg-icon-color', 'colourful').click();
  await expect(option(page, 'seg-icon-color', 'colourful')).toHaveAttribute('aria-pressed', 'true');
  await settled(page);
  expect(await signatureHtml(page)).not.toBe(before);
  const st = await storedState(page);
  expect([st.iconStyle, st.iconWeight, st.iconColor]).toEqual(['circle', 'line', 'colourful']);

  await option(page, 'icon-picker', 'labels').click();
  await expect(option(page, 'seg-icon-weight', 'bold')).toBeDisabled();
  await expect(option(page, 'seg-icon-color', 'theme')).toBeDisabled();
});

test('the shape picker shows the photo in every shape, and a new shape redraws the photo', async ({ page }) => {
  await goTo(page, 'photo');
  const picker = page.getByTestId('shape-picker');
  const tiles = picker.locator('label[data-value]');
  await expect(tiles).toHaveCount(15);
  // Auto is a word, not a shape; every other tile shows the photo in its shape.
  await expect.poll(() => loaded(picker.locator('label[data-value]:not([data-value="auto"]) img'))).toBe(14);

  await option(page, 'shape-picker', 'circle').click();
  await settled(page);
  const circle = await photoSrc(page);
  await option(page, 'shape-picker', 'hexagon').click();
  await settled(page);
  expect(await photoSrc(page)).not.toBe(circle);
  expect((await storedState(page)).photoShape).toBe('hexagon');
});

test('the photo look changes the photo', async ({ page }) => {
  await goTo(page, 'photo');
  await option(page, 'seg-look', 'natural').click();
  await settled(page);
  const natural = await photoSrc(page);
  await option(page, 'seg-look', 'duotone').click();
  await expect(option(page, 'seg-look', 'duotone')).toHaveAttribute('aria-pressed', 'true');
  await settled(page);
  expect(await photoSrc(page)).not.toBe(natural);
  expect((await storedState(page)).photoLook).toBe('duotone');
});

test('the comet animation plays a few times, and keep looping makes it loop', async ({ page }) => {
  await goTo(page, 'photo');
  await page.locator('[data-show="animate"]').check();
  await page.getByTestId('loop-toggle').uncheck();
  await option(page, 'seg-anim', 'comet').click();
  await settled(page);
  const brief = apngPlays(await photoSrc(page));
  expect(brief).not.toBeNull();
  expect(brief).toBeGreaterThan(0);

  await page.getByTestId('loop-toggle').check();
  await settled(page);
  expect(apngPlays(await photoSrc(page))).toBe(0);
  expect((await storedState(page)).motion).toBe('loop');
});

test('turning animations off leaves a still signature', async ({ page }) => {
  await goTo(page, 'photo');
  const animate = page.locator('[data-show="animate"]');
  await animate.check();
  await option(page, 'seg-anim', 'comet').click();
  await settled(page);
  await expect(page.getByTestId('a11y-readout')).toContainText('animated');

  await animate.uncheck();
  await settled(page);
  expect((await storedState(page)).show['animate']).toBe(false);
  expect(apngPlays(await photoSrc(page))).toBeNull();
  await expect(page.getByTestId('a11y-readout')).toContainText('no animation');
  await expect(page.getByTestId('weight')).not.toContainText('animated');
});

for (const template of ['aurora', 'executive', 'postcard', 'editor', 'monogram']) {
  test(`${template}: every size changes the visible avatar in three columns`, async ({ page }) => {
    await pickDesign(page, template);
    await goTo(page, 'layout');
    await option(page, 'seg-columns', '3').click();
    await goTo(page, 'photo');
    let previous = 0;
    for (const size of ['S', 'M', 'L', 'XL']) {
      await option(page, 'seg-photo-size', size).click();
      await expect(option(page, 'seg-photo-size', size)).toHaveAttribute('aria-pressed', 'true');
      await settled(page);
      const avatar = page
        .getByTestId('signature')
        .locator(template === 'monogram' ? 'img[alt=""]' : 'img[alt^="Photo of"]')
        .first();
      const width = await avatar.evaluate((image) => image.getBoundingClientRect().width);
      expect(width).toBeGreaterThan(previous);
      previous = width;
    }
    await expect(page.getByTestId('pane-photo')).toContainText('40% larger');
    expect(await storedState(page)).toMatchObject({ photoSize: 'XL', cols: 3 });
  });
}

test('Minimal explains that it has no photo instead of offering a size that does nothing', async ({ page }) => {
  await pickDesign(page, 'minimal');
  await goTo(page, 'photo');
  for (const size of ['S', 'M', 'L', 'XL']) await expect(option(page, 'seg-photo-size', size)).toBeDisabled();
  await expect(page.getByTestId('pane-photo')).toContainText('Minimal has no photo.');
  await expect(page.getByTestId('signature').locator('img[alt^="Photo of"]')).toHaveCount(0);
});

test('columns are set in Layout & colour, and the preview toolbar only changes the view', async ({ page }) => {
  const toolbar = page.getByTestId('preview-toolbar');
  for (const id of ['seg-version', 'seg-mode', 'seg-scheme', 'seg-device'])
    await expect(toolbar.getByTestId(id)).toBeVisible();
  await expect(toolbar.locator('[data-testid="seg-cols"], [data-testid="seg-name"]')).toHaveCount(0);

  await goTo(page, 'layout');
  await option(page, 'seg-columns', '2').click();
  await settled(page);
  expect((await storedState(page)).cols).toBe(2);
  await expect(page.getByTestId('a11y-readout')).toContainText('2 columns');

  await option(page, 'seg-columns', '3').click();
  await expect(option(page, 'seg-columns', '2')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('pane-layout')).toContainText('all three');
  await settled(page);
  expect((await storedState(page)).cols).toBe(3);
  await expect(page.getByTestId('a11y-readout')).toContainText('3 columns');

  await option(page, 'seg-columns', 'auto').click();
  expect((await storedState(page)).cols).toBe('auto');
});

test('every field that can be hidden has a show switch beside it', async ({ page }) => {
  let total = 0;
  for (const pane of ['details', 'contact', 'extras']) {
    await goTo(page, pane);
    const rows = page
      .getByTestId(`pane-${pane}`)
      .locator('[data-row]')
      .filter({ has: page.locator('[data-show]') });
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const row = rows.nth(i);
      await expect(row.locator('[data-field]')).toHaveCount(1);
      await expect(row.getByRole('switch')).toHaveAccessibleName(/^Show .+ in the signature$/);
    }
    total += n;
  }
  expect(total).toBeGreaterThanOrEqual(25);
});

test('an office phone shows with non-breaking spaces, and its switch hides it and dims the row', async ({ page }) => {
  await goTo(page, 'contact');
  const row = page.locator('[data-row="office"]');
  const field = row.locator('[data-field="office"]');
  await row.getByRole('switch').check();
  await field.fill('+1 425 555 0199');
  await expect.poll(() => signatureHtml(page)).toContain('+1&nbsp;425&nbsp;555&nbsp;0199');
  const colour = (): Promise<string> => field.evaluate((el) => getComputedStyle(el).color);
  const shown = await colour();

  await row.getByRole('switch').uncheck();
  await settled(page);
  expect(await signatureHtml(page)).not.toContain('425&nbsp;555&nbsp;0199');
  expect((await storedState(page)).show['office']).toBe(false);
  expect(await colour()).not.toBe(shown);
});

test('signature health checks both versions and distinguishes automated checks from real-client tests', async ({
  page,
}) => {
  const readout = page.getByTestId('a11y-readout');
  await expect(readout).toContainText('alt text');
  await expect(readout).toContainText('Open Check for measured contrast');

  await goTo(page, 'check');
  const items = page.getByTestId('a11y-list').locator('li[data-check]');
  await expect(items).toHaveCount(19);
  expect(await items.evaluateAll((li) => li.map((x) => x.getAttribute('data-check')))).toEqual(
    expect.arrayContaining([
      'language',
      'images',
      'links',
      'reading-order',
      'text-size',
      'contrast',
      'motion',
      'size',
      'phone',
      'paste',
      'pixel-size',
      'font-fallback',
      'features',
      'native',
      'destinations',
    ]),
  );
  await expect(page.getByTestId('a11y-score')).toHaveText('All automated checks pass');
  await expect(items.and(page.locator('[data-ok="false"]'))).toHaveCount(0);
  await expect(items.and(page.locator('[data-check="native"]'))).toHaveAttribute('data-status', 'manual');
  await option(page, 'check-version', 'reply').click();
  await expect(items).toHaveCount(19);
  await expect(page.getByTestId('pane-check')).toContainText('reply');
  await page.getByRole('combobox', { name: 'Outlook client' }).selectOption('outlook-classic');
  await expect(page.getByTestId('client-profile')).toContainText('No Word rendering engine');
  await page.getByTestId('check-again').click();
  await expect(page.getByTestId('a11y-score')).toHaveText('All automated checks pass');
  await goTo(page, 'layout');
  await option(page, 'seg-columns', '3').click();
  await settled(page);
  await goTo(page, 'check');
  await option(page, 'check-version', 'new').click();
  await expect(page.getByTestId('a11y-score')).toHaveText('All automated checks pass');
  await expect(page.getByTestId('pane-check')).toContainText('3 columns');
});

test('featured items can show in every design, with a third item', async ({ page }) => {
  await goTo(page, 'extras');
  await page.locator('[data-row="feat1"]').getByRole('switch').check();
  await page.locator('[data-field="feat1"]').fill('contoso-sample-app');
  const place = page.locator('[data-place="featured"]');
  await place.selectOption('auto');
  await settled(page);
  expect(await signatureHtml(page)).not.toContain('contoso-sample-app');

  await place.selectOption('all');
  await settled(page);
  expect(await signatureHtml(page)).toContain('contoso-sample-app');
  expect((await storedState(page)).place['featured']).toBe('all');

  await page.locator('[data-field="feat3"]').fill('Contoso launch talk');
  await page.locator('[data-field="feat3desc"]').fill('Keynote at the spring summit');
  await page.locator('[data-field="feat3url"]').fill('contoso.example/launch');
  await page.locator('[data-field="feat3tag"]').fill('Talk');
  await expect.poll(() => signatureHtml(page)).toContain('Contoso launch talk');
  await settled(page);
  expect(await signatureHtml(page)).toContain('https://contoso.example/launch');
});
