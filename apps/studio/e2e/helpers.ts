import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

export const fixture = (name: string): string => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

// Browser noise that is not an app error: the engine reads canvas pixels many times on purpose.
const IGNORED = [/willReadFrequently/];

export interface Watch {
  problems: string[];
  external: string[];
}

/** Collects console errors and warnings, page errors and requests that leave the machine. */
export function watch(page: Page): Watch {
  const w: Watch = { problems: [], external: [] };
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !IGNORED.some((r) => r.test(m.text()))) {
      w.problems.push(`${m.type()}: ${m.text()}`);
    }
  });
  page.on('pageerror', (e) => w.problems.push(`page error: ${e.message}`));
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.hostname !== 'localhost') w.external.push(r.url());
  });
  return w;
}

export const signature = (page: Page): Locator => page.getByTestId('signature');

/** Waits until the preview shows the signature for the current settings. */
export async function settled(page: Page): Promise<void> {
  await expect(signature(page)).toHaveAttribute('aria-busy', 'false');
  await expect(signature(page).locator('table').first()).toBeAttached();
}

/**
 * Opens Design with the engine's sample person (Sam Taylor, Contoso) and `seed` on top,
 * instead of the random person a first visit gets, so results are the same on every run.
 * The seed is written only when nothing is saved yet, so reloads keep what a test changed.
 */
export async function open(page: Page, seed: Record<string, unknown> = {}): Promise<Watch> {
  const w = watch(page);
  await page.addInitScript(
    ({ key, value }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    },
    { key: 'signature-studio.state.v5', value: JSON.stringify({ state: { state: seed }, version: 0 }) },
  );
  await page.goto('/');
  await settled(page);
  await goTo(page, 'design');
  return w;
}

// The signature lives in a shadow root, which innerHTML does not include.
export const signatureHtml = (page: Page): Promise<string> =>
  signature(page).evaluate((el) => {
    const host = [...el.querySelectorAll('*')].find((n) => n.shadowRoot);
    return host?.shadowRoot?.innerHTML ?? '';
  });

/** The text a reader sees in the signature shadow root inside `el`, with spaces collapsed. */
export const shadowText = (el: Locator): Promise<string> =>
  el.evaluate((box) => {
    const root = [...box.querySelectorAll('*')].find((n) => n.shadowRoot)?.shadowRoot;
    if (!root) return '';
    const text = [...root.childNodes].filter((n) => n.nodeName !== 'STYLE').map((n) => n.textContent ?? '');
    return text.join(' ').replace(/\s+/g, ' ').trim();
  });

/** How many signature shadow roots inside `el` hold a table, that is, a built signature. */
export const builtCount = (el: Locator): Promise<number> =>
  el.evaluate((box) => [...box.querySelectorAll('*')].filter((n) => n.shadowRoot?.querySelector('table')).length);

/** The `src` of the photo in the signature. */
export const photoSrc = (page: Page): Promise<string> =>
  signature(page).evaluate((el) => {
    const host = [...el.querySelectorAll('*')].find((n) => n.shadowRoot);
    return host?.shadowRoot?.querySelector('img[alt^="Photo of"]')?.getAttribute('src') ?? '';
  });

/** How many times an animated PNG plays: 0 means forever, null means it is not animated. */
export function apngPlays(dataUrl: string): number | null {
  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  const at = bytes.indexOf('acTL');
  // acTL holds the frame count, then the play count, as 4-byte big-endian numbers.
  return at < 0 ? null : bytes.readUInt32BE(at + 8);
}

/** A button in a segmented control (`seg-*`) or a tile in a picker (`*-picker`), by its value. */
export const option = (page: Page, testId: string, value: string): Locator =>
  page.getByTestId(testId).locator(`[data-value="${value}"]`);

export async function goTo(page: Page, pane: string): Promise<void> {
  const sections: Record<string, string> = {
    details: 'details',
    contact: 'details',
    photo: 'details',
    extras: 'details',
    layout: 'style',
    name: 'style',
    icons: 'style',
    reply: 'style',
    files: 'use',
  };
  await page.getByTestId(`step-${sections[pane] ?? pane}`).click();
  if (pane in sections && pane !== 'files') await page.getByTestId(`tab-${pane}`).click();
  await expect(page.getByTestId(`pane-${pane}`)).toBeVisible();
}

/** Picks what the Design gallery shows: a collection, a role or an industry. */
export async function showInGallery(page: Page, filter: string): Promise<void> {
  await page.getByTestId('gallery-filter').selectOption(filter);
}

export async function pickDesign(page: Page, id: string): Promise<void> {
  await goTo(page, 'design');
  const card = page.getByTestId(`design-${id}`);
  if ((await card.count()) === 0) await showInGallery(page, 'all');
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await settled(page);
}

/** The settings the tests read back, as the Studio saves them in local storage. */
export interface StoredState {
  fullName: string;
  template: string;
  colors: string[];
  gradient: boolean;
  cols: 'auto' | 1 | 2 | 3;
  photoShape: string;
  photoLook: string;
  photoSize: string;
  photoAnim: string;
  motion: string;
  handStyle: string;
  bgMode: string;
  bgColor: string;
  replyStyle: string;
  iconStyle: string;
  iconFamily: string;
  emailProfile: string;
  iconWeight: string;
  iconColor: string;
  show: Record<string, boolean>;
  place: Record<string, string>;
  photo: { src: string };
  logo: { src: string };
}

export interface StoredStyle {
  id: string;
  name: string;
  s: Record<string, unknown>;
}

export const storedState = (page: Page): Promise<StoredState> =>
  page.evaluate((): StoredState => JSON.parse(localStorage.getItem('signature-studio.state.v5') ?? '{}').state.state);

export const storedStyles = (page: Page): Promise<StoredStyle[]> =>
  page.evaluate(
    (): StoredStyle[] => JSON.parse(localStorage.getItem('signature-studio.styles.v5') ?? '{}').state?.saved ?? [],
  );

/** Opens the style file chooser and picks a styles file made from `styles`. JSON is valid YAML, so it is written as JSON. */
export async function importStyles(page: Page, styles: readonly { name: string; s: object }[]): Promise<void> {
  const text = JSON.stringify({ 'signature-styles': 1, styles: styles.map((m) => ({ name: m.name, ...m.s })) });
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('import-styles').click();
  await (
    await chooser
  ).setFiles({ name: 'signature-styles.yaml', mimeType: 'application/yaml', buffer: Buffer.from(text) });
}

/** Picks `file` in the open dialog that `button` brings up. */
export async function openFile(
  page: Page,
  file: string | { name: string; mimeType: string; buffer: Buffer },
  button = 'open-file',
): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId(button).click();
  await (await chooser).setFiles(file);
}

/** Starts over from the header menu, confirming the dialog that asks first. */
export async function startOver(page: Page, which: 'new-blank' | 'random-sample' | 'reset-everything'): Promise<void> {
  await page.getByTestId('start-over').click();
  await page.getByTestId(which).click();
  await page.getByTestId('confirm-start').click();
  await expect(page.getByTestId('start-over-dialog')).toHaveCount(0);
}

export async function saveStyle(page: Page, name: string): Promise<void> {
  await goTo(page, 'design');
  await page.getByTestId('save-style').click();
  await page.getByTestId('style-name').fill(name);
  await page.getByTestId('style-name').press('Enter');
  await expect(page.getByTestId('toast').filter({ hasText: `Saved “${name}”` })).toBeVisible();
}
