import { FONT_OPTIONS, TEXT_SIZE_OPTIONS } from './options.ts';
import type { Palette, PhotoPosition, SignatureState, ViewState } from './types.ts';

/** Images are drawn at twice their CSS size so they stay sharp on high-density screens. */
export const SCALE = 2;

export const FONT =
  "'Segoe UI','Segoe UI Web (West European)',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',Arial,sans-serif";

const FONT_SEMI =
  "'Segoe UI Semibold','Segoe UI','Segoe UI Web (West European)',-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',Arial,sans-serif";

export const MONO = "'Cascadia Code','Cascadia Mono',Consolas,'SFMono-Regular',Menlo,monospace";

export const CANVAS_FONT =
  "'Segoe UI Variable Text','Segoe UI',system-ui,-apple-system,BlinkMacSystemFont,Roboto,'Helvetica Neue',Arial,sans-serif";

export const SCRIPT_FONT =
  "'Segoe Script','Lucida Handwriting','Brush Script MT','Snell Roundhand','Apple Chancery','URW Chancery L',cursive";

export const MS_COLORS = ['#F25022', '#7FBA00', '#00A4EF', '#FFB900'];

/** Style for a cell that holds only an image, so no line box adds height. */
export const IMGTD = 'font-size:0;line-height:0;';

export const SERIF = "Georgia,'Times New Roman',Times,serif";

/**
 * A text field as a string, for values that may come from a config file or plain JavaScript.
 * Numbers and booleans are written out like `String(v || '')`; anything else is empty.
 */
export function textOf(v: unknown): string {
  if (typeof v === 'string') return v;
  return typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint' ? String(v || '') : '';
}

/** Rough width of a line of text, to decide whether it fits beside the handwriting on a phone. */
export function textW(html: string, fs: number): number {
  return (
    html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, 'x').length *
    fs *
    0.56
  );
}

/** Escapes text for HTML content and attribute values. */
export function esc(v: string | number | null | undefined): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escaped text that must not break across lines (phone numbers). */
export function nb(v: string | number | null | undefined): string {
  return esc(v).replace(/ /g, '&nbsp;');
}

/** A full link for a web address typed without its scheme. */
export function url(v: string | null | undefined): string {
  v = (v || '').trim();
  if (!v) return '';
  return /^(https?:|mailto:|tel:)/i.test(v) ? v : `https://${v.replace(/^\/+/, '')}`;
}

/** A web address as people read it: no scheme, no `www.`, no trailing slash. */
export function pretty(v: string | null | undefined): string {
  return (v || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '');
}

export function teamsUrl(s: Pick<ViewState, 'email'> & Partial<Pick<ViewState, 'linkEmail'>>): string {
  return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent((s.linkEmail || s.email || '').trim())}`;
}

export function telOf(s: Pick<ViewState, 'phone'>, num?: string | null): string {
  return `tel:${(num == null ? s.phone : num || '').replace(/[^\d+]/g, '')}`;
}

/** Inline font style: size and line height in px, with Outlook's exact line height rule. */
export function f(size: number, lh: number, color: string, semi?: boolean | 0 | 1 | '', extra?: string): string {
  return `font-family:${semi ? FONT_SEMI : FONT};font-size:${size}px;line-height:${lh}px;color:${color};${semi ? 'font-weight:600;' : 'font-weight:400;'}mso-line-height-rule:exactly;${extra || ''}`;
}

/** Apply to every design's inline text styles, including its own serif or code font. Images and spacers stay intact. */
export function withTypography(html: string, state: Pick<SignatureState, 'font' | 'textSize'>): string {
  if (state.font === 'auto' && state.textSize === 'standard') return html;
  const font = FONT_OPTIONS.find((option) => option.id === state.font)?.stack ?? '';
  const min = TEXT_SIZE_OPTIONS.find((t) => t.id === state.textSize)?.min ?? 11;
  const template = document.createElement('template');
  template.innerHTML = html;
  for (const el of template.content.querySelectorAll('[style]')) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.tagName !== 'TD') el.style.removeProperty('white-space');
    if (font && el.style.fontFamily) el.style.fontFamily = font;
    const size = Number.parseFloat(el.style.fontSize);
    if (size >= 11 && size < min) {
      const line = Number.parseFloat(el.style.lineHeight);
      el.style.fontSize = `${min}px`;
      if (Number.isFinite(line)) el.style.lineHeight = `${line + min - size}px`;
    }
  }
  return template.innerHTML;
}

/** A layout table that Outlook keeps: no spacing, no borders, `role="presentation"`. */
export function tbl(inner: string, style?: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;${style || ''}">${inner}</table>`;
}

export function tr(cells: string): string {
  return `<tr>${cells}</tr>`;
}

export function td(content: string, style?: string, attrs?: string): string {
  return `<td${attrs ? ` ${attrs}` : ''} style="${style || ''}">${content}</td>`;
}

export interface ImgOptions {
  /** Sits in a line of text. */
  inline?: boolean;
  /** Extra inline CSS. */
  css?: string;
}

/**
 * An image at a fixed size. Every image has alt text; decoration gets `alt=""` and `role="presentation"`
 * so screen readers skip it. Layouts fit a phone with images at full size, so images never shrink.
 */
export function img(tok: string, w: number, h: number, alt?: string, o: ImgOptions = {}): string {
  /* fixed images keep their size and proportions even where an editor lets images shrink to fit (height follows the width) */
  const size = `width:${w}px;min-width:${w}px;height:auto;`;
  return `<img src="${tok}" width="${w}" height="${h}" alt="${esc(alt || '')}"${alt ? '' : ' role="presentation"'} style="display:${o.inline ? 'inline-block' : 'block'};${size}border:0;outline:none;text-decoration:none;${o.inline ? 'vertical-align:middle;' : ''}${o.css || ''}">`;
}

export function link(href: string, inner: string, color: string, extra?: string, title?: string): string {
  return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''} style="color:${color};text-decoration:none;${extra || ''}">${inner}</a>`;
}

export function hr(color: string): string {
  return tbl(
    tr(`<td height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px solid ${color};">&nbsp;</td>`),
    'width:100%;',
  );
}

const SPACER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/** An invisible line that sets how narrow the columns may get beside a floating photo before they move under it. */
export function spacer(w: number): string {
  return `<img src="${SPACER}" width="${w}" height="1" alt="" role="presentation" style="display:block;width:${w}px;height:1px;border:0;">`;
}

/** Settings for the render in progress. `compose()` sets them before a design's `html()` runs and resets them after. */
export interface RenderContext {
  /** True when the icon style is text labels instead of icons. */
  on: boolean;
  /** Accent colour for text links. */
  acc: string;
  name: string;
  title: string;
  photoPos: PhotoPosition;
  /** Markup of the third column (link icons), or empty. */
  col3: string;
  /** Set by a design that placed the third column itself. */
  col3used: boolean;
  /** True for the large photo sizes. */
  big: boolean;
  /** Selected fonts or larger text need more room than a design's original typography. */
  customTypography: boolean;
}

export const renderContext: RenderContext = {
  on: false,
  acc: '#0F6CBD',
  name: '',
  title: '',
  photoPos: 'column',
  col3: '',
  col3used: false,
  big: false,
  customTypography: false,
};

/* markers for the name row of two columns (written so they never read as a comment inside the page's script) */

/** Marks the start of the name row in two columns. `build()` removes it. */
// oxlint-disable-next-line no-useless-concat -- split so the page's inline script never holds a comment opener
export const HP0 = '<!-' + '-hp-->';

/** Marks the end of the name row in two columns. `build()` removes it. */
// oxlint-disable-next-line no-useless-concat -- split so the page's inline script never holds a comment opener
export const HP1 = '<!-' + '-/hp-->';

/** Marks where the name sits in the name row. `build()` removes it. */
// oxlint-disable-next-line no-useless-concat -- split so the page's inline script never holds a comment opener
export const NM = '<!-' + '-nm-->';

/** Options for `cgrid()`. */
export interface GridOptions {
  /** One item per line, always. */
  one?: boolean;
  /** Space between lines in px (5 when left out). */
  row?: number;
  /** Space after the first item in px (18 when left out). */
  gap?: number;
  /** Width of the first item in px, so the second lines up (170 when left out). */
  min?: number;
  /** Not used. */
  max?: number;
}

/** Parts along one line that wrap between parts on narrow screens. The separator stays at the end of a line. */
export function flowLine(parts: readonly string[], P: Palette, sep?: string): string {
  const list = parts.filter(Boolean);
  const s2 = sep === undefined ? '&middot;' : sep;
  return list
    .map((h, i) => {
      const tail =
        i === list.length - 1
          ? ''
          : s2
            ? `&nbsp;&nbsp;<span style="color:${P.faint};">${s2}</span>&nbsp;`
            : '&nbsp;&nbsp;&nbsp;';
      return `<span style="display:inline-block;white-space:nowrap;">${h}${tail}</span>`;
    })
    .join(' ');
}

/** True for a piece short enough to keep on one line (an email, a phone number, a short label). */
export function shortText(h: string): boolean {
  return (
    h
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, 'x')
      .trim().length <= 24
  );
}

/**
 * Two items to a line on wide screens, one per line on narrow ones (`o.one`: always one per line). Each line is its own row,
 * so a line can never grow wider than two items, even in an editor that drops max-widths. The first item has a fixed width
 * so the second lines up, and on a narrow screen the second moves under the first.
 */
export function cgrid(cells: readonly string[], o?: GridOptions | null): string {
  const opt = o || {};
  if (!cells.length) return '';
  const row = opt.row ?? 5;
  const gap = opt.gap ?? 18;
  const w = opt.min || 170;
  let out = '';
  if (opt.one)
    return tbl(
      cells
        .map((c, i) => tr(td(c, (i ? `padding-top:${row}px;` : '') + (shortText(c) ? 'white-space:nowrap;' : ''))))
        .join(''),
    );
  for (let i = 0; i < cells.length; i += 2) {
    const a = cells[i];
    const b = cells[i + 1];
    out += tr(
      td(
        `<span style="display:inline-block;vertical-align:top;width:${w}px;padding:0 ${gap}px 0 0;">${a}</span>${b ? ` <span style="display:inline-block;vertical-align:top;">${b}</span>` : ''}`,
        `font-size:12px;line-height:18px;${i ? `padding-top:${row}px;` : ''}`,
      ),
    );
  }
  return tbl(out);
}

/** Items on lines of at most `maxW` px, each line its own row (a line still wraps on a narrow screen). */
export function lineRows(
  items: readonly string[],
  P: Palette,
  sep: string | undefined,
  maxW: number,
  style: string,
  firstPad?: string,
  fs?: number,
): string {
  const rows: string[][] = [];
  let cur: string[] = [];
  let w = 0;
  items.filter(Boolean).forEach((h) => {
    const iw = textW(h, fs || 12) + (/<img/.test(h) ? 22 : 0) + 24;
    if (cur.length && w + iw > maxW) {
      rows.push(cur);
      cur = [];
      w = 0;
    }
    cur.push(h);
    w += iw;
  });
  if (cur.length) rows.push(cur);
  return rows.map((r, i) => tr(td(flowLine(r, P, sep), style + (i ? 'padding-top:1px;' : firstPad || '')))).join('');
}
