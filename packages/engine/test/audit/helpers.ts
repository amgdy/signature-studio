/// <reference types="vite/client" />
// Helpers for the audits: which designs to audit, the signatures they build, what each Outlook
// editor keeps of a pasted signature, and a stage that measures what a reader would see.
import {
  build,
  TEMPLATES,
  type BuildResult,
  type Design,
  type NameStyle,
  type ShowFlags,
  type StateInput,
  type Version,
} from '../../src/index.ts';
import { FIXTURE_PROFILE, testPhoto } from '../fixtures.ts';
export { keepAsOutlook } from '../../src/compatibility.ts';
export type { EditorMode } from '../../src/compatibility.ts';

// Audit filters. The audits run in the browser, where `process.env` does not exist, so they read
// VITE_-prefixed variables, which Vite passes to `import.meta.env` without any config:
//   VITE_AUDIT_DESIGNS=executive,aurora npx vitest run --project audit
//   VITE_AUDIT_ALL=1 npx vitest run --project audit contrast
declare global {
  interface ImportMetaEnv {
    /** Design ids to audit, separated by commas. Every design when unset. */
    readonly VITE_AUDIT_DESIGNS?: string;
    /** "1" checks contrast in every palette, not just each design's own and four others. */
    readonly VITE_AUDIT_ALL?: string;
  }
}

const requested = (import.meta.env.VITE_AUDIT_DESIGNS ?? '')
  .split(',')
  .map((id) => id.trim().toLowerCase())
  .filter(Boolean);

// A typo must fail the run, not quietly audit nothing.
const unknown = requested.filter((id) => !TEMPLATES.some((d) => d.id === id));
if (unknown.length) {
  throw new Error(
    `VITE_AUDIT_DESIGNS names unknown designs: ${unknown.join(', ')}. Designs: ${TEMPLATES.map((d) => d.id).join(', ')}`,
  );
}

/** The designs to audit, in gallery order. */
export const AUDIT_DESIGNS: readonly Design[] = requested.length
  ? TEMPLATES.filter((d) => requested.includes(d.id))
  : TEMPLATES;

/** True when VITE_AUDIT_ALL asks for the slow, every-palette contrast run. */
export const AUDIT_ALL: boolean = /^(1|true|yes)$/i.test(import.meta.env.VITE_AUDIT_ALL ?? '');

// The signatures the audits build: the neutral fixture profile with the test photo, plus the
// fields and switches each audit turns on.
export const NAME_STYLES: readonly NameStyle[] = ['typed', 'hand'];

/** Every optional contact and line filled, with long values, so layouts are as wide as they get. */
export const FULL_FIELDS = {
  pronouns: 'they/them',
  altName: '\u0633\u0627\u0645 \u062a\u0627\u064a\u0644\u0648\u0631',
  office: '+1 425 555 0100',
  hours: 'Mon\u2013Fri, 9:00\u201317:00 (WET)',
  languages: 'English, Portuguese',
  youtube: 'youtube.com/@sample',
  learn: 'learn.microsoft.com/users/sample',
  blog: 'contoso.com/blog',
  booking: 'outlook.office.com/bookwithme/user/abc',
  banner: 'Book a cloud architecture briefing',
  bannerUrl: 'https://contoso.com',
  disclaimer:
    'This message may contain confidential information. If you are not the intended recipient, please delete it and let the sender know.',
} as const satisfies StateInput;

/** The optional lines the phone audits show. Animation is off: the audits measure the finished frame. */
export const FULL_SHOW: Partial<ShowFlags> = {
  banner: true,
  disclaimer: true,
  x: true,
  booking: true,
  tagline: true,
  signoff: true,
  animate: false,
};

/**
 * Runs `fn` for each item, one after another. Builds must not overlap, because the engine keeps
 * per-render settings in one shared render context, and each stage is measured on its own.
 */
export async function inOrder<T>(items: readonly T[], fn: (item: T) => Promise<void>): Promise<void> {
  for (const item of items) {
    // oxlint-disable-next-line no-await-in-loop -- running one at a time is the point (see above)
    await fn(item);
  }
}

/** Builds a signature for the fixture profile and test photo, with `over` on top. */
export async function buildAudit(over: StateInput, version: Version = 'new'): Promise<BuildResult> {
  const src = await testPhoto();
  return build({ ...FIXTURE_PROFILE, ...over, photo: { src } }, { version });
}

// A stage for measuring signature HTML: a box of a given width inside a shadow root, so the test
// page's CSS cannot reach it, with helpers that measure what a reader would see.
/** The page around the signature: Outlook's compose area. */
export interface PageLook {
  /** A CSS `font` shorthand. */
  font: string;
  color: string;
  background: string;
}

/** A plain compose page: 12 px Segoe UI (Arial on a Mac), black on white. */
const COMPOSE_PAGE: PageLook = {
  font: "12px 'Segoe UI', Arial, sans-serif",
  color: '#000000',
  background: '#FFFFFF',
};

export interface Stage {
  /** The box the signature sits in. Its width is the editor or screen width. */
  readonly box: HTMLElement;
  /** Images that could not be decoded, by alt text. */
  readonly broken: readonly string[];
  /** Changes the box width. The next measurement lays the signature out again. */
  setWidth(px: number): void;
  /** Takes the stage off the page. */
  remove(): void;
}

/** Waits until every image under `root` has decoded, so sizes are final. Returns the ones that failed. */
async function decodeImages(root: ParentNode): Promise<string[]> {
  const imgs = Array.from(root.querySelectorAll('img'));
  const ok = await Promise.all(
    imgs.map((img) =>
      img.decode().then(
        () => true,
        () => false,
      ),
    ),
  );
  return imgs.filter((_, i) => !ok[i]).map((img) => img.alt || img.src.slice(0, 40));
}

/** Puts signature HTML on the page in an isolated box `width` px wide, and waits for its images. */
async function mount(html: string, width: number, page: PageLook = COMPOSE_PAGE): Promise<Stage> {
  const host = document.createElement('div');
  document.body.append(host);
  const root = host.attachShadow({ mode: 'open' });
  const box = document.createElement('div');
  // `all:initial` stops inherited styles of the test page; border-box with no padding.
  box.style.cssText = `all:initial;display:block;box-sizing:border-box;padding:0;width:${width}px;font:${page.font};color:${page.color};background:${page.background}`;
  box.innerHTML = html;
  root.append(box);
  const broken = await decodeImages(box);
  return {
    box,
    broken,
    setWidth(px: number): void {
      box.style.width = `${px}px`;
    },
    remove(): void {
      host.remove();
    },
  };
}

/** Builds a stage, runs `fn` on it and always removes it. */
export async function withStage<T>(
  html: string,
  width: number,
  fn: (stage: Stage) => T | Promise<T>,
  page?: PageLook,
): Promise<T> {
  const stage = await mount(html, width, page);
  try {
    return await fn(stage);
  } finally {
    stage.remove();
  }
}

/** How far the signature spills past the right edge of its box, and the widest pieces that cannot shrink. */
export interface Overflow {
  /** Pixels past the right edge. */
  px: number;
  /** Up to four pieces wider than 100 px, widest first: images, and text at its narrowest. */
  widest: string[];
}

/** The overflow of the signature in `box`, or null when everything fits (1 px of rounding allowed). */
export function overflowOf(box: HTMLElement): Overflow | null {
  const edge = box.getBoundingClientRect().right;
  let right = Number.NEGATIVE_INFINITY;
  for (const el of Array.from(box.querySelectorAll('*'))) {
    const b = el.getBoundingClientRect();
    if (b.width && b.right > edge + 1) right = Math.max(right, b.right);
  }
  return right === Number.NEGATIVE_INFINITY ? null : { px: Math.round(right - edge), widest: widestPieces(box) };
}

/** The narrowest an element's content can be: its width at `min-content`, with its own font and wrapping. */
function minContentWidth(el: HTMLElement, box: HTMLElement): number {
  const cs = getComputedStyle(el);
  const probe = document.createElement('div');
  probe.style.cssText = [
    'position:absolute',
    'left:0',
    'top:0',
    'width:min-content',
    `font-family:${cs.fontFamily}`,
    `font-size:${cs.fontSize}`,
    `font-weight:${cs.fontWeight}`,
    `letter-spacing:${cs.letterSpacing}`,
    `white-space:${cs.whiteSpace}`,
    `word-break:${cs.wordBreak}`,
    `padding-left:${cs.paddingLeft}`,
    `padding-right:${cs.paddingRight}`,
  ].join(';');
  probe.innerHTML = el.innerHTML;
  box.append(probe);
  const w = probe.getBoundingClientRect().width;
  probe.remove();
  return w;
}

/** The pieces most likely to cause an overflow: the widest images and unbreakable text, over 100 px. */
function widestPieces(box: HTMLElement): string[] {
  const pieces: { el: HTMLElement; w: number }[] = [];
  for (const el of Array.from(box.querySelectorAll<HTMLElement>('img, td, span, a, div'))) {
    if (el.tagName === 'IMG') pieces.push({ el, w: el.getBoundingClientRect().width });
    else if (!el.querySelector('table, img') && (el.textContent ?? '').trim()) {
      pieces.push({ el, w: minContentWidth(el, box) });
    }
  }
  return pieces
    .filter((p) => p.w > 100)
    .toSorted((a, b) => b.w - a.w)
    .slice(0, 4)
    .map(({ el, w }) => {
      const label = ((el.textContent ?? '').trim() || el.getAttribute('alt') || '').slice(0, 34);
      return `${el.tagName} "${label}" ${Math.round(w)}px`;
    });
}

/** Problems with the images in `box`: any drawn out of shape, or narrower than its `width` attribute. */
export function imageProblems(box: HTMLElement): string[] {
  const bad: string[] = [];
  for (const im of Array.from(box.querySelectorAll('img'))) {
    const aw = Number(im.getAttribute('width'));
    const ah = Number(im.getAttribute('height'));
    // Spacers are GIFs that stretch on purpose.
    if (!aw || aw < 2 || (im.getAttribute('src') ?? '').startsWith('data:image/gif')) continue;
    const b = im.getBoundingClientRect();
    const name = im.alt || 'image';
    const thinLine = b.height <= 6 && Math.abs(b.height - ah) <= 1.5;
    if (!thinLine && Math.abs(b.width / b.height - aw / ah) > (0.03 * aw) / ah) {
      bad.push(`distorted ${name} ${Math.round(b.width)}x${Math.round(b.height)} of ${aw}x${ah}`);
    } else if (b.width < aw - 1) {
      bad.push(`shrunk ${name} ${Math.round(b.width)} of ${aw}`);
    }
  }
  return bad;
}

/** The width of the signature's first table, in whole pixels. */
export function signatureWidth(box: HTMLElement): number {
  const table = box.querySelector('table');
  return table ? Math.round(table.getBoundingClientRect().width) : 0;
}

/** How many lines an inline element runs over. */
export function lineCount(el: Element): number {
  const lh = Number.parseFloat(getComputedStyle(el).lineHeight) || 18;
  const rects = Array.from(el.getClientRects());
  const top = rects[0]?.top ?? 0;
  return new Set(rects.map((r) => Math.round((r.top - top) / (lh * 0.8)))).size;
}

/** One piece of visible text: its colours, size and contrast. */
export interface TextReading {
  text: string;
  /** Computed text colour, as `rgb(...)`. */
  color: string;
  /** The background it sits on, as `rgb(...)`. */
  background: string;
  /** Font size in px. */
  size: number;
  /** WCAG contrast ratio of the text on its background. */
  ratio: number;
  /** The ratio it needs: 4.5, or 3 for large text (24 px, or bold 18.66 px and up). */
  need: number;
}

type Rgba = [number, number, number, number];

/** Text that is only separators ("|", "/", "·", "•", "→") is decoration. */
const SEPARATORS = /^[|/\u00b7\u2022\u2192\s]+$/;

function parseColor(css: string): Rgba {
  const n = (css.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0, n.length > 3 ? (n[3] ?? 1) : 1];
}

/** One sRGB channel (0 to 255) as linear light. */
function linear(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance. */
function luminance([r, g, b]: Rgba): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio of two colours. */
function contrastRatio(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The first mostly opaque background at or above `el`, or the page when there is none. */
function backgroundOf(el: Element | null, page: Rgba): Rgba {
  for (let e = el; e; e = e.parentElement) {
    const c = parseColor(getComputedStyle(e).backgroundColor);
    if (c[3] > 0.5) return c;
  }
  return page;
}

const rgb = (c: Rgba): string => `rgb(${c.slice(0, 3).join(', ')})`;

/**
 * Reads every visible piece of text in `box`, with its contrast against the background it really sits on.
 * Text over no background of its own sits on the box's background (the page), or white.
 */
export function readText(box: HTMLElement): TextReading[] {
  const pageBg = backgroundOf(box, [255, 255, 255, 1]);
  const out: TextReading[] = [];
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.nodeValue ?? '').replace(/\u00a0/g, ' ').trim();
    const el = node.parentElement;
    if (!text || !el || SEPARATORS.test(text)) continue;
    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    const bg = backgroundOf(el, pageBg);
    const size = Number.parseFloat(cs.fontSize);
    const large = size >= 24 || (Number.parseInt(cs.fontWeight, 10) >= 600 && size >= 18.66);
    out.push({ text, color: rgb(fg), background: rgb(bg), size, ratio: contrastRatio(fg, bg), need: large ? 3 : 4.5 });
  }
  return out;
}
