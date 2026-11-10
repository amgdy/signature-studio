import { expect, test } from '@playwright/test';
import pkg from '../package.json' with { type: 'json' };
import { fixture, goTo, open, option, pickDesign, settled, signature, signatureHtml, watch } from './helpers.ts';

test('starts with Details and exposes five ordered sections with a separate Outlook profile', async ({ page }) => {
  await page.goto('/');
  await settled(page);
  await expect(page.getByTestId('pane-details')).toBeVisible();
  const steps = page.getByTestId('section-rail').getByRole('tab');
  await expect(steps).toHaveText(['Details', 'Design', 'Style', 'Check', 'Use']);
  await expect(page.getByRole('combobox', { name: 'Email profile', exact: true })).toHaveValue('outlook');
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /Outlook/);
  await page.getByTestId('step-details').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('step-design')).toBeFocused();
  await expect(page.getByTestId('gallery')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByTestId('pane-files')).toBeVisible();
  await expect(page.getByTestId('save-html')).toBeVisible();
  await expect(page.getByText('Add it to Outlook', { exact: true })).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.getByTestId('pane-details')).toBeVisible();
});

for (const width of [1440, 343]) {
  test(`the build footer shows its version, date and run without crowding the page at ${width}px`, async ({
    page,
    context,
  }) => {
    const w = watch(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const footer = page.getByRole('contentinfo', { name: 'Build information' });
    await expect(footer).toContainText(`v${pkg.version}`);
    const time = footer.locator('time');
    const builtAt = await time.getAttribute('datetime');
    expect(builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    await expect(time).toHaveText(`${builtAt?.slice(0, 10)} UTC`);
    const id = process.env['STUDIO_BUILD_RUN_ID'] ?? process.env['GITHUB_RUN_ID'];
    const number = process.env['STUDIO_BUILD_RUN_NUMBER'] ?? process.env['GITHUB_RUN_NUMBER'];
    const link = footer.getByRole('link');
    if (id) {
      await expect(link).toContainText(`Build #${number}`);
      await expect(link).toHaveAttribute(
        'href',
        `${process.env['GITHUB_SERVER_URL']}/${process.env['GITHUB_REPOSITORY']}/actions/runs/${id}`,
      );
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    } else {
      await expect(footer).toContainText('Local build');
      await expect(link).toHaveCount(0);
    }
    for (const scheme of ['light', 'dark']) {
      await page.getByTestId('app-appearance').click();
      await page.getByTestId(`appearance-${scheme}`).click();
      await page.keyboard.press('Escape');
      await expect(page.locator('html')).toHaveAttribute('data-app-theme', scheme);
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      if (width === 343) {
        const bottom = page.getByTestId('bottom-bar');
        await expect(bottom).toBeInViewport({ ratio: 1 });
        const bounds = await footer.boundingBox();
        const bar = await bottom.boundingBox();
        if (!bounds || !bar) throw new Error('The footer and bottom bar must be visible.');
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(bar.y + 1);
      } else {
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        await expect(page.getByTestId('copy-signature')).toBeInViewport({ ratio: 1 });
      }
    }
    expect(w.external).toEqual([]);
    if (id) {
      const url = await link.getAttribute('href');
      if (!url) throw new Error('The CI build must link to its run.');
      await context.route(url, (route) => route.fulfill({ contentType: 'text/html', body: 'Build run' }));
      await link.focus();
      const popup = page.waitForEvent('popup');
      await page.keyboard.press('Enter');
      const run = await popup;
      await expect(run).toHaveURL(url);
      await run.close();
    }
    expect(w.problems).toEqual([]);
  });

  test(`all editor sections fit their column at ${width}px`, async ({ page }) => {
    await open(page);
    await page.setViewportSize({ width, height: 900 });
    for (const pane of [
      'details',
      'contact',
      'photo',
      'extras',
      'design',
      'layout',
      'name',
      'icons',
      'reply',
      'check',
      'files',
    ]) {
      await goTo(page, pane);
      const settings = page.getByTestId('settings');
      await expect.poll(() => settings.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
    for (const id of ['new', 'classic', 'mac', 'tips']) {
      await page.locator(`#guide-tab-${id}`).click();
      await expect(page.locator(`#guide-tab-${id}`)).toBeInViewport({ ratio: 1 });
      expect(await page.getByTestId('settings').evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(
        1,
      );
    }
  });

  test(`the shadcn preset b6no21zDOK works offline in light and dark at ${width}px`, async ({ page, context }) => {
    const w = watch(page);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      if (!localStorage.getItem('signature-studio.state.v5')) {
        localStorage.setItem('signature-studio.state.v5', JSON.stringify({ state: { state: {} }, version: 0 }));
      }
      // A theme saved by an older version is ignored.
      if (!localStorage.getItem('signature-studio.ui.v5')) {
        localStorage.setItem(
          'signature-studio.ui.v5',
          JSON.stringify({ state: { appTheme: 'light', uiTheme: 'fluent' }, version: 0 }),
        );
      }
    });
    await context.setOffline(true);
    await page.goto(new URL('../dist/index.html', import.meta.url).href);
    const footer = page.getByRole('contentinfo', { name: 'Build information' });
    await expect(footer).toContainText(`v${pkg.version}`);
    const buildLabel = await footer.textContent();
    const view = page.getByRole('group', { name: 'Edit or preview', exact: true });
    if (width === 343) await view.getByRole('button', { name: 'Preview', exact: true }).click();
    await settled(page);
    const before = await signatureHtml(page);
    const saved = await page.evaluate(() => localStorage.getItem('signature-studio.state.v5'));
    const html = page.locator('html');
    await expect(html).not.toHaveAttribute('data-ui-theme');

    // Paint each colour to compare what renders, since the build may rewrite oklch() in another notation.
    const palette = () =>
      html.evaluate((el) => {
        const css = getComputedStyle(el);
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) throw new Error('Canvas is required to compare preset colours.');
        const pixel = (colour: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = colour;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data];
        };
        return {
          colours: ['--primary', '--foreground', '--chart-1'].map((key) => pixel(css.getPropertyValue(key))),
          light: ['oklch(0.5 0.134 242.749)', 'oklch(0.153 0.006 107.1)', 'oklch(0.845 0.143 164.978)'].map(pixel),
          dark: ['oklch(0.443 0.11 240.79)', 'oklch(0.988 0.003 106.5)', 'oklch(0.845 0.143 164.978)'].map(pixel),
          radius: Number.parseFloat(css.getPropertyValue('--radius')),
        };
      });
    const light = await palette();
    expect(light.colours).toEqual(light.light);
    expect(light.radius).toBe(0.625);
    await expect(page.getByTestId(width === 343 ? 'copy-signature-bar' : 'copy-signature')).toHaveCSS(
      'border-radius',
      '10px',
    );

    await page.getByTestId('app-appearance').click();
    await expect(page.getByRole('menuitemradio')).toHaveText([/^Auto/, 'Light', 'Dark']);
    await expect(page.getByTestId('app-appearance').locator('svg.lucide')).toBeVisible();
    await page.getByTestId('appearance-dark').click();
    await page.keyboard.press('Escape');
    await page.reload();
    expect(await footer.textContent()).toBe(buildLabel);
    await expect(html).toHaveAttribute('data-app-theme', 'dark');
    await expect.poll(async () => (await palette()).colours).toEqual(light.dark);
    expect(
      await page.evaluate(() => JSON.parse(localStorage.getItem('signature-studio.ui.v5') ?? '{}').state),
    ).not.toHaveProperty('uiTheme');

    await goTo(page, 'details');
    await expect(page.locator('body')).toHaveCSS('font-family', /Manrope Variable/);
    await expect(page.getByTestId('pane-details').getByRole('heading', { name: 'Profile' })).toHaveCSS(
      'font-family',
      /Montserrat Variable/,
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    expect(
      await page.evaluate(
        () => document.fonts.check('14px "Manrope Variable"') && document.fonts.check('18px "Montserrat Variable"'),
      ),
    ).toBe(true);

    if (width === 343) await view.getByRole('button', { name: 'Preview', exact: true }).click();
    await settled(page);
    expect(await signatureHtml(page)).toBe(before);
    expect(await page.evaluate(() => localStorage.getItem('signature-studio.state.v5'))).toBe(saved);
    expect(w.problems).toEqual([]);
    expect(w.external.filter((url) => !url.startsWith('file:'))).toEqual([]);
  });

  test(`app Light, Dark and Auto persist independently of the signature at ${width}px`, async ({ page }) => {
    const w = watch(page);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-app-theme', 'dark');
    for (const theme of ['light', 'dark', 'auto']) {
      await page.getByTestId('app-appearance').click();
      await page.getByTestId(`appearance-${theme}`).click();
      await expect(page.locator('html')).toHaveAttribute('data-app-theme', theme === 'light' ? 'light' : 'dark');
      await page.reload();
      await expect(page.getByTestId('app-appearance')).toHaveAccessibleName(new RegExp(theme, 'i'));
      expect(
        await page.evaluate(() => JSON.parse(localStorage.getItem('signature-studio.ui.v5') ?? '{}').state.dark),
      ).toBe(false);
    }
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-app-theme', 'light');
    for (const step of ['details', 'design', 'style', 'check', 'use']) {
      await expect(page.getByTestId(`step-${step}`)).toBeInViewport({ ratio: 1 });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(w.problems).toEqual([]);
    expect(w.external).toEqual([]);
  });
}

test('loads with a signature, no console errors and no network requests', async ({ page }) => {
  const w = await open(page);
  await expect(page.getByRole('heading', { name: 'Signature Studio' })).toBeVisible();
  await expect(page.getByTestId('weight')).toContainText('KB');
  await expect(page.getByTestId('a11y-readout')).toContainText('Accessibility');
  await page.waitForTimeout(1500);
  expect(w.problems).toEqual([]);
  expect(w.external).toEqual([]);
});

test('the built file opens from disk with the network off', async ({ page, context }) => {
  const w = watch(page);
  await context.setOffline(true);
  await page.goto(new URL('../dist/index.html', import.meta.url).href);
  await expect(signature(page).locator('img').first()).toBeVisible();
  await expect(page.getByTestId('weight')).toContainText('KB');
  expect(w.problems).toEqual([]);
  expect(w.external.filter((u) => !u.startsWith('file:'))).toEqual([]);
});

test('picking a design updates the preview', async ({ page }) => {
  await open(page);
  const before = await signatureHtml(page);
  const card = page.getByTestId('design-terminal');
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('weight')).toContainText('Terminal');
  await expect.poll(() => signatureHtml(page)).not.toBe(before);
});

test('the section rail switches panes, with arrow keys too', async ({ page }) => {
  await open(page);
  await goTo(page, 'details');
  await expect(page.getByTestId('pane-details')).toBeVisible();
  await expect(page.getByTestId('tab-details')).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('tab-contact')).toBeFocused();
  await expect(page.getByTestId('pane-contact')).toBeVisible();

  await goTo(page, 'check');
  await expect(page.getByTestId('a11y-list')).toBeVisible();

  await page.reload();
  await expect(page.getByTestId('pane-check')).toBeVisible();
});

test('the logo goes back to the start and keeps your work, with Start over beside it', async ({ page }) => {
  await open(page);
  await page.setViewportSize({ width: 1440, height: 700 });
  await goTo(page, 'details');
  await page.locator('[data-field="title"]').fill('Head of Testing');
  await goTo(page, 'reply');
  await option(page, 'seg-mode', 'compare').click();

  const home = page.getByRole('button', { name: 'Signature Studio, back to the start' });
  await home.click();
  await expect(page.getByTestId('pane-details')).toBeVisible();
  await expect(page.getByTestId('step-details')).toHaveAttribute('aria-selected', 'true');
  await expect(option(page, 'seg-version', 'new')).toHaveAttribute('aria-pressed', 'true');
  await expect(option(page, 'seg-mode', 'single')).toHaveAttribute('aria-pressed', 'true');
  await expect(signature(page)).toContainText('Head of Testing');

  // Already at the start, the logo still scrolls the settings back to the top.
  const settings = page.getByTestId('settings');
  await settings.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect.poll(() => settings.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await home.click();
  await expect.poll(() => settings.evaluate((el) => el.scrollTop)).toBe(0);

  const startOver = await page.getByTestId('start-over').boundingBox();
  const profile = await page.getByRole('combobox', { name: 'Email profile', exact: true }).boundingBox();
  expect(startOver?.x).toBeLessThan(profile?.x ?? 0);
});

test('typing a detail changes the signature', async ({ page }) => {
  await open(page);
  await goTo(page, 'details');
  await page.locator('[data-field="title"]').fill('Head of Testing');
  await expect(signature(page)).toContainText('Head of Testing');
});

test('the reply version toggle switches to the reply signature', async ({ page }) => {
  await open(page);
  const version = page.getByTestId('seg-version');
  await version.getByRole('button', { name: 'Reply' }).click();
  await expect(version.getByRole('button', { name: 'Reply' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('weight')).toContainText('Reply');
  await expect(page.getByTestId('copy-signature')).toHaveText('Copy reply signature');
  await expect(page.getByTestId('mail')).toContainText('From:');
});

test('copy signature puts rich text on the clipboard and says so', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  await page.getByTestId('copy-signature').click();
  await expect(page.getByTestId('toast').first()).toContainText('copied');
  const types = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    return items.flatMap((i) => Array.from(i.types));
  });
  expect(types).toContain('text/html');
});

test('a company logo uploads, scales down, shows in the signature and can be removed', async ({ page }) => {
  await open(page);
  await pickDesign(page, 'executive');
  // With no company name beside it, the logo is named in its alt text, so the test can find it.
  await goTo(page, 'details');
  await page.locator('[data-field="company"]').fill('');
  await goTo(page, 'photo');
  await expect(page.getByTestId('logo-preview')).toHaveCount(0);
  await page.locator('[data-show="logo"]').check();
  await expect(page.getByTestId('pane-photo')).toContainText('No logo uploaded yet');
  await settled(page);
  expect(await signatureHtml(page)).not.toContain('alt="Company logo"');

  await page.getByTestId('logo-file').setInputFiles(fixture('logo.png'));
  const preview = page.getByTestId('logo-preview');
  await expect(preview).toBeVisible();
  const size = await preview.evaluate((img: HTMLImageElement) => ({
    w: img.naturalWidth,
    h: img.naturalHeight,
    png: img.src.startsWith('data:image/png;base64,'),
  }));
  expect(size).toEqual({ w: 128, h: 64, png: true });
  await expect(page.getByTestId('upload-logo')).toHaveText('Change logo');
  await expect.poll(() => signatureHtml(page)).toContain('alt="Company logo"');

  await page.getByTestId('remove-logo').click();
  await expect(page.getByTestId('logo-preview')).toHaveCount(0);
  await expect(page.getByTestId('upload-logo')).toHaveText('Upload logo');
  await settled(page);
  expect(await signatureHtml(page)).not.toContain('alt="Company logo"');
});

test('the phone preview fits a 343 px column', async ({ page }) => {
  await open(page);
  await page.getByTestId('seg-device').getByRole('button', { name: 'Phone' }).click();
  await expect
    .poll(() =>
      signature(page).evaluate((el) => {
        const host = [...el.querySelectorAll('*')].find((n) => n.shadowRoot);
        return host ? Math.round(host.getBoundingClientRect().width) : 0;
      }),
    )
    .toBe(343);
});

test('on a wide screen the settings and the preview scroll on their own, and the header, tabs and Copy stay put', async ({
  page,
}) => {
  await open(page);
  const settings = page.getByTestId('settings');
  await settings.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect.poll(() => settings.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('banner')).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('section-rail')).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('preview-toolbar')).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('copy-signature')).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('bottom-bar')).toHaveCount(0);

  await goTo(page, 'details');
  await expect.poll(() => page.getByTestId('settings').evaluate((el) => el.scrollTop)).toBe(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the tabs stay at the top and the bottom bar switches between editing and the preview', async ({ page }) => {
    const w = watch(page);
    await page.goto('/');
    await expect(page.getByTestId('settings')).toBeVisible();
    await expect(page.getByTestId('preview')).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.getByTestId('section-rail')).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('bottom-bar')).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('copy-signature-bar')).toBeEnabled();

    await option(page, 'seg-show', 'preview').click();
    await settled(page);
    await expect(page.getByTestId('settings')).toHaveCount(0);
    await expect(page.getByTestId('copy-signature')).toHaveCount(0);
    await expect(signature(page)).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);

    await goTo(page, 'contact');
    await expect(page.getByTestId('pane-contact')).toBeVisible();
    await expect(option(page, 'seg-show', 'edit')).toHaveAttribute('aria-pressed', 'true');
    expect(w.problems).toEqual([]);
  });

  test('the logo goes from the preview back to editing Details', async ({ page }) => {
    await page.goto('/');
    await goTo(page, 'contact');
    await option(page, 'seg-show', 'preview').click();
    await settled(page);
    await page.getByTestId('home').click();
    await expect(page.getByTestId('pane-details')).toBeVisible();
    await expect(option(page, 'seg-show', 'edit')).toHaveAttribute('aria-pressed', 'true');
  });
});
