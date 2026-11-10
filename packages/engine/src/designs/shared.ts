/* Helpers that several designs use. */
import {
  addLogo,
  altRow,
  contactsOf,
  item,
  logoInline,
  photoImg,
  photoSpec,
  replyContacts,
  socialsOf,
  taglineRow,
} from '../content.ts';
import { cgrid, esc, f, flowLine, link, nb, renderContext, tbl, td, tr } from '../html.ts';
import { iconFor, wantIcons } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import type { ContactItem, LinkFields, Social } from '../content.ts';
import type { DrawnIconStyle, IconKind } from '../icons.ts';
import type { AssetSizes, AssetTokens, Design, Palette, SpecMap, Theme, Version, ViewState } from '../types.ts';

/** Options for `lineItem()`. */
export interface LineItemOptions {
  /** Icon size in px, when an icon is shown (12 when left out). */
  size?: number;
  /** Font size in px (12 when left out). */
  fs?: number;
  /** Line height in px (18 when left out). */
  lh?: number;
  /** Link colour (the palette's body colour when left out). */
  linkColor?: string;
}

/* one-letter labels for contacts */
const LETTER: Readonly<Partial<Record<IconKind, string>>> = {
  phone: 'm',
  office: 'o',
  mail: 'e',
  web: 'w',
  location: 'a',
  hours: 'h',
  languages: 'l',
  calendar: 'b',
};

/** A contact with a one-letter label (m, e, w...) unless an icon style or text labels are chosen. */
export function lineItem(
  c: ContactItem,
  A: AssetTokens,
  P: Palette,
  acc: string,
  opts?: LineItemOptions | null,
): string {
  const o = opts || {};
  if (A[`ic_${c.k}`] || renderContext.on) return item(c, A, P, { size: o.size || 12, gap: 6, fs: o.fs, lh: o.lh });
  const txt = c.k === 'phone' || c.k === 'office' ? nb(c.text) : esc(c.text);
  const val = c.href ? link(c.href, txt, o.linkColor || P.body) : txt;
  return `<span style="${f(o.fs || 12, o.lh || 18, P.body)}"><span style="${f(o.fs || 12, o.lh || 18, acc, true)}" title="${esc(c.label)}">${LETTER[c.k] || c.k.charAt(0)}</span>&nbsp;&nbsp;${val}</span>`;
}

/** Adds icon specs for contacts (`ic_` names) and, when `socialsToo` is true, for profile links (`so_` names, 2 px larger). */
export function iconSpecs(
  a: SpecMap,
  s: LinkFields,
  th: Theme,
  list: readonly ContactItem[],
  socialsToo: boolean,
  size: number,
  style: DrawnIconStyle,
): void {
  list.forEach((c) => {
    a[`ic_${c.k}`] = iconFor(style, c.k, size, th, {}, false, false);
  });
  if (socialsToo)
    socialsOf(s).forEach((x) => {
      a[`so_${x.k}`] = iconFor(style, x.k, size + 2, th, {}, true, false);
    });
}

/** Profile links as text along one line that wraps between links. */
export function textLinks(so: readonly Social[], acc: string, P: Palette, sep?: string): string {
  return so.length
    ? flowLine(
        so.map((x) => link(x.href, nb(x.label), acc)),
        P,
        sep,
      )
    : '';
}

/** Shared content for the industry designs; each design arranges and frames it itself. */
export const directoryAssets: Design['assets'] = function (s, th, v, o) {
  const a: SpecMap = {};
  nameAsset(a, s, th, v, o, { n: 26, r: 18, maxN: 200 });
  if (v === 'new') {
    if (s.show.photo) a.photo = photoSpec(s, th, 64, 'circle', null, 'png', 'none', o);
    addLogo(a, s, 18);
  }
  if (wantIcons(s)) iconSpecs(a, s, th, v === 'reply' ? replyContacts(s) : contactsOf(s), v === 'new', 12, 'glyph');
  return a;
};

export function directoryParts(
  s: ViewState,
  A: AssetTokens,
  D: AssetSizes,
  th: Theme,
  P: Palette,
  v: Version,
  nameCss = '',
) {
  const small = v === 'reply';
  const accent = P.dark ? th.accentDark : th.accent;
  const identity =
    nameRow(s, A, D, P, f(small ? 16 : 22, small ? 22 : 28, P.ink, true, nameCss)) +
    (s.title ? tr(td(esc(s.title), f(13, 19, accent))) : '') +
    (small ? '' : altRow(s, P, 14, 20));
  const organisation =
    (s.team && !small ? tr(td(esc(s.team), f(12, 18, P.body))) : '') +
    (A.logo ? tr(td(logoInline(A, s, 18, P))) : s.company ? tr(td(esc(s.company), f(13, 19, P.ink, true))) : '') +
    (s.region ? tr(td(esc(s.region), f(12, 18, P.muted))) : '') +
    (small ? '' : taglineRow(s, P));
  const contacts = (small ? replyContacts(s) : contactsOf(s)).map((c) => item(c, A, P, { size: 12, gap: 5 }));
  if (!small)
    contacts.push(
      ...socialsOf(s).map((x) =>
        item({ k: x.k, href: x.href, text: x.label, label: '' }, A, P, { pre: 'so_', size: 14, gap: 5 }),
      ),
    );
  return {
    identity,
    organisation,
    contacts: cgrid(contacts, { one: true, row: 3 }),
    photo: small ? '' : photoImg(A, 64, s),
    accent,
  };
}

export function directoryLayout(rows: string, contacts: string, s: ViewState, P: Palette, photo = ''): string {
  const body =
    s.colsEff === 2
      ? twoCol(tbl(rows), contacts, P, { gap: 12 })
      : tbl(rows + (contacts ? tr(td(contacts, 'padding-top:8px;')) : ''));
  return withPhoto(photo, body, 12, { min: 280, min1: 190 });
}
