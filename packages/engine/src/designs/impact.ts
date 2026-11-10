import { tint } from '../color.ts';
import {
  altRow,
  companyLine,
  contactsOf,
  item,
  logoInline,
  photoImg,
  photoSpec,
  replyContacts,
  socials,
  socialsOf,
  statsOf,
} from '../content.ts';
import { cgrid, esc, f, flowLine, tbl, td, tr } from '../html.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import { iconSpecs } from './shared.ts';
import type { SpecMap } from '../types.ts';

/** An empty cell of a fixed width. */
function spacerCell(w: number): string {
  return td('&nbsp;', `width:${w}px;font-size:1px;line-height:1px;`, `width="${w}"`);
}

export const impactDesign = defineDesign({
  id: 'impact',
  name: 'Highlights',
  theme: 'copilot',
  anim: 'none',
  cols: 1,
  icons: 'circle',
  extras: ['stats'],
  cats: ['anyrole', 'leadership'],
  badge: 'New',
  tag: 'Three highlight numbers under your name',
  blurb:
    'Lets your track record speak: three highlight numbers, such as years, results or awards, in tinted tiles under your name. Suits sales, consulting, recruiting, healthcare and leadership.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 24, r: 18, maxN: 200 });
    if (s.show.photo)
      a.photo = small
        ? photoSpec(s, th, 40, 'circle', { w: 2, gap: 2, stops: th.stops }, 'png', 'none', o, true)
        : photoSpec(s, th, 72, 'circle', { w: 3, gap: 3, stops: th.stops }, 'png', this.anim, o);
    iconSpecs(a, s, th, small ? replyContacts(s) : contactsOf(s), !small, small ? 16 : 18, 'circle');
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const small = v === 'reply';
    const two = s.colsEff === 2;
    let rows = '';
    rows += nameRow(s, A, D, P, f(small ? 15 : 20, small ? 20 : 26, P.ink, true));
    if (s.title) rows += tr(td(esc(s.title), f(small ? 12 : 13, small ? 18 : 19, acc, true)));
    const org = [small ? s.company : companyLine(s)].filter(Boolean).map(esc).join('');
    if (org) rows += tr(td(org, f(12, 18, P.muted)));
    const items = (small ? replyContacts(s) : contactsOf(s)).map((c) =>
      item(c, A, P, { size: small ? 16 : 18, gap: 6 }),
    );
    if (small) {
      if (two && items.length)
        return withPhoto(
          s.show.photo ? photoImg(A, 40, s) : '',
          twoCol(tbl(rows), cgrid(items, { one: true, row: 3 }), P, { gap: 14 }),
          12,
        );
      if (items.length) rows += tr(td(flowLine(items, P), `${f(12, 18, P.body)}padding-top:4px;`));
      return withPhoto(s.show.photo ? photoImg(A, 40, s) : '', tbl(rows), 12);
    }
    rows += altRow(s, P, 14, 20);
    const stats = statsOf(s);
    const bg = tint(th, P);
    const tiles = stats.length
      ? tbl(
          tr(
            stats
              .map(
                (x, i) =>
                  (i ? spacerCell(6) : '') +
                  td(
                    tbl(
                      tr(td(esc(x[0]), f(20, 24, acc, true, 'font-weight:700;'))) +
                        (x[1] ? tr(td(esc(x[1]), f(11, 14, P.body))) : ''),
                    ),
                    `background-color:${bg};padding:8px 10px;vertical-align:top;`,
                    `bgcolor="${bg}" valign="top"`,
                  ),
              )
              .join(''),
          ),
        )
      : '';
    const so = socialsOf(s);
    const soRow = so.length ? socials(so, A, 20, 6, s, P) : s.show.logo && A.logo ? logoInline(A, s, 14, P, 13) : '';
    let body;
    if (two) {
      const top = twoCol(
        tbl(rows),
        cgrid(items, { one: true, row: 4 }) + (soRow ? `<div style="padding-top:8px;">${soRow}</div>` : ''),
        P,
        { gap: 16 },
      );
      body = tbl(tr(td(top)) + (tiles ? tr(td(tiles, 'padding-top:12px;')) : ''));
    } else {
      if (tiles) rows += tr(td(tiles, 'padding-top:10px;'));
      if (items.length)
        rows += tr(td(cgrid(items, { one: s.show.stack, min: 170, gap: 16, row: 4 }), 'padding-top:10px;'));
      if (soRow) rows += tr(td(soRow, 'padding-top:6px;'));
      body = tbl(rows);
    }
    return withPhoto(s.show.photo ? photoImg(A, 72, s) : '', body, 16);
  },
});
