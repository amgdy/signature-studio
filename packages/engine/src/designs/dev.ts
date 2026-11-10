/* Building blocks shared by the developer designs: Terminal, Code Editor and Agent.
   Each is a dark window drawn with table cells (Outlook keeps their colours), every word real text in a code font, and only small
   decorative images with no alt text: the window dots, prompt marks, a cursor that blinks a few times and a spinner that
   settles on a tick. Colours are GitHub and VS Code dark palettes, all at least 4.5:1 on their backgrounds. */
import { socialsOf } from '../content.ts';
import { esc, img, link, MONO, nb, tbl, td, tr } from '../html.ts';
import type { ContactItem, LinkFields } from '../content.ts';
import type { ContactKind } from '../icons.ts';
import type { AssetSizes, AssetTokens, Palette, SignatureState } from '../types.ts';

/** Colours of the dark terminal window (GitHub dark). */
export const DEV = {
  bg: '#0D1117',
  bar: '#161B22',
  line: '#30363D',
  text: '#E6EDF3',
  muted: '#9198A1',
  green: '#3FB950',
  cyan: '#79C0FF',
  orange: '#FFA657',
  purple: '#D2A8FF',
};

/** The palette helpers (pronouns, Arabic name, contact items, two columns) use inside the dark windows. */
export const DP: Palette = {
  dark: true,
  ink: DEV.text,
  body: DEV.text,
  muted: DEV.muted,
  faint: '#6E7681',
  line: DEV.line,
  chipBg: DEV.bar,
  chipBorder: DEV.line,
  logoText: DEV.text,
  link: DEV.cyan,
};

/** Inline text style in the code font. `extra` is added at the end. */
export function mono(size: number, lh: number, color: string, bold?: boolean, extra?: string): string {
  return `font-family:${MONO};font-size:${size}px;line-height:${lh}px;color:${color};font-weight:${bold ? 700 : 400};mso-line-height-rule:exactly;${extra || ''}`;
}

/** A user name for the prompt: the sign-off name or last name in lower case, or `me`. */
export function devId(s: Pick<SignatureState, 'signoffName' | 'fullName'>): string {
  const n = (s.signoffName || '').trim() || (s.fullName || '').trim().split(/\s+/).pop() || 'me';
  return n.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'me';
}

/** A window with rounded corners around some rows (10 px corners when `radius` is left out). */
export function devWin(rows: string, bg: string, border: string, radius?: number): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="${bg}" style="border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;background-color:${bg};border:1px solid ${border};border-radius:${radius || 10}px;">${rows}</table>`;
}

/** A small decorative image by name (12 px with a 6 px gap when left out), or nothing when it is missing. */
export function mark(A: AssetTokens, n: string, size?: number, gap?: number): string {
  return A[n] ? img(A[n], size || 12, size || 12, '', { inline: true, css: `margin:0 ${gap ?? 6}px 2px 0;` }) : '';
}

/** A contact as plain value text in a code font: phone numbers stay whole, links are underlined so they read as links. */
export function devVal(c: ContactItem, color: string): string {
  const ph = c.k === 'phone' || c.k === 'office';
  const t = ph ? nb(c.text) : esc(c.text);
  return c.href
    ? link(c.href, t, color, 'text-decoration:underline;', c.label)
    : `<span style="color:${DEV.text};">${t}</span>`;
}

/** Short lower-case keys for contacts, as in a config file. */
export const DEVKEY: Readonly<Record<ContactKind, string>> = {
  phone: 'mobile',
  office: 'office',
  mail: 'email',
  web: 'web',
  location: 'based',
  hours: 'hours',
  languages: 'speaks',
  calendar: 'book',
};

/** Profile links as underlined lower-case words. */
export function devLinks(s: LinkFields, color: string): string[] {
  return socialsOf(s).map((x) =>
    link(x.href, nb(x.k === 'teams' ? 'teams' : x.label.toLowerCase()), color, 'text-decoration:underline;', x.label),
  );
}

/** The reply version in a small dark box. `s`, `A` and `D` are not used. */
export function devReply(_s: SignatureState, _A: AssetTokens, _D: AssetSizes, inner: string): string {
  return tbl(
    tr(
      td(
        inner,
        `${mono(12, 18, DEV.text)}background-color:${DEV.bg};padding:6px 10px;border-radius:6px;`,
        `bgcolor="${DEV.bg}"`,
      ),
    ),
  );
}
