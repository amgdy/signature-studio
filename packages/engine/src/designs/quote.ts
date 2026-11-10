import { altRow, contactsOf, item, photoImg, photoSpec, replyContacts, socials, socialsOf } from '../content.ts';
import { cgrid, esc, f, flowLine, img, IMGTD, SERIF, tbl, td, tr } from '../html.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import { iconSpecs } from './shared.ts';
import type { SpecMap } from '../types.ts';

export const quoteDesign = defineDesign({
  id: 'quote',
  name: 'Motto',
  theme: 'coral',
  anim: 'none',
  cols: 1,
  icons: 'glyph',
  extras: ['quote'],
  cats: ['anyrole', 'creative'],
  badge: 'New',
  tag: 'Your motto in a large serif quote',
  blurb:
    'Leads with a line you live by in a large serif quote, then your name, role and contacts. Suits coaches, educators, creatives, founders and leaders.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 22, r: 18, maxN: 200 });
    if (!small && s.quote) a.qmark = { kind: 'quote', size: 34, stops: th.stops };
    if (s.show.photo)
      a.photo = photoSpec(s, th, small ? 40 : 56, 'circle', null, 'png', small ? 'none' : this.anim, o, small);
    iconSpecs(
      a,
      s,
      th,
      small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location'),
      !small,
      13,
      'glyph',
    );
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const small = v === 'reply';
    const two = s.colsEff === 2;
    let rows = '';
    rows += nameRow(s, A, D, P, f(small ? 15 : 16, small ? 20 : 22, P.ink, true));
    const role = [s.title, s.company].filter(Boolean).map(esc).join(' &middot; ');
    if (role) rows += tr(td(role, f(12, 18, P.muted)));
    const items = (small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location')).map((c) =>
      item(c, A, P, { size: 13, gap: 5 }),
    );
    const pic = s.show.photo ? photoImg(A, small ? 40 : 56, s) : '';
    if (small) {
      if (two && items.length)
        return withPhoto(pic, twoCol(tbl(rows), cgrid(items, { one: true, row: 2 }), P, { gap: 14 }), 12);
      if (items.length) rows += tr(td(flowLine(items, P), `${f(12, 18, P.body)}padding-top:3px;`));
      return withPhoto(pic, tbl(rows), 12);
    }
    rows += altRow(s, P, 13, 19);
    const so = socialsOf(s);
    const soRow = so.length ? socials(so, A, 15, 8, s, P) : '';
    let who;
    if (two)
      who = twoCol(
        tbl(rows),
        cgrid(items, { one: true, row: 3 }) + (soRow ? `<div style="padding-top:6px;">${soRow}</div>` : ''),
        P,
        { gap: 16 },
      );
    else {
      if (items.length) rows += tr(td(flowLine(items, P), `${f(12, 18, P.body)}padding-top:6px;`));
      if (soRow) rows += tr(td(soRow, 'padding-top:6px;'));
      who = tbl(rows);
    }
    let quote = '';
    if (s.quote) {
      quote = tbl(
        tr(
          (A.qmark
            ? td(img(A.qmark, 34, 34, ''), `${IMGTD}padding:2px 10px 0 0;vertical-align:top;`, 'valign="top"')
            : '') +
            td(
              esc(s.quote) +
                (s.quoteBy
                  ? `<div style="${f(12, 18, P.muted)}font-style:normal;padding-top:4px;">&mdash;&nbsp;${esc(s.quoteBy)}</div>`
                  : ''),
              `${f(17, 24, P.ink, false, `font-family:${SERIF};font-style:italic;`)}vertical-align:top;`,
              'valign="top"',
            ),
        ),
      );
      quote += tbl(
        tr(
          td(
            '&nbsp;',
            `font-size:1px;line-height:1px;height:3px;width:36px;background-color:${acc};`,
            `bgcolor="${acc}" width="36" height="3"`,
          ),
        ),
        'margin:10px 0 10px 0;',
      );
    }
    return tbl((quote ? tr(td(quote)) : '') + tr(td(withPhoto(pic, who, 14))));
  },
});
