import { deep } from '../color.ts';
import {
  altRow,
  companyLine,
  contactsOf,
  item,
  photoImg,
  photoSpec,
  replyContacts,
  socials,
  socialsOf,
} from '../content.ts';
import { cgrid, esc, f, flowLine, IMGTD, lineRows, tbl, td, tr } from '../html.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import { iconSpecs } from './shared.ts';
import type { SpecMap } from '../types.ts';

export const badgeDesign = defineDesign({
  id: 'badge',
  name: 'Name Badge',
  theme: 'ember',
  anim: 'none',
  cols: 1,
  icons: 'glyph',
  cats: ['anyrole', 'creative'],
  badge: 'New',
  tag: 'A \u201CHello, my name is\u201D conference badge',
  blurb:
    'Friendly and instantly recognisable: a conference name badge with a bold colour band, your name written large (try the handwritten name, like marker on a badge) and your contacts at the foot. Suits events, community, sales, recruiting and teaching.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 28, r: 18, maxN: 210 });
    if (s.show.photo && !small)
      a.photo = photoSpec(s, th, 56, 'circle', { w: 2, gap: 2, stops: th.stops }, 'png', this.anim, o);
    iconSpecs(a, s, th, small ? replyContacts(s) : contactsOf(s), !small, 12, 'glyph');
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const small = v === 'reply';
    const two = s.colsEff === 2;
    const band = deep(th.stops[0]);
    const items = (small ? replyContacts(s) : contactsOf(s)).map((c) => item(c, A, P, { size: 12, gap: 5 }));
    if (small) {
      const hi = `<span style="${f(12, 18, '#FFFFFF', true, 'letter-spacing:1.4px;')}background-color:${band};padding:1px 6px;">HELLO</span>`;
      return tbl(
        tr(
          td(
            tbl(
              tr(
                td(hi, 'padding:0 8px 0 0;vertical-align:middle;', 'valign="middle"') +
                  td(tbl(nameRow(s, A, D, P, f(15, 20, P.ink, true))), 'vertical-align:middle;', 'valign="middle"'),
              ),
            ),
          ),
        ) +
          (s.title ? tr(td(esc(s.title), `${f(12, 18, P.body)}padding-top:2px;`)) : '') +
          (items.length ? tr(td(flowLine(items, P), `${f(12, 18, P.body)}padding-top:2px;`)) : ''),
      );
    }
    const top = tbl(
      tr(
        td(
          'HELLO',
          `${f(24, 28, '#FFFFFF', true, 'font-weight:800;letter-spacing:3px;')}text-align:center;`,
          'align="center"',
        ),
      ) + tr(td('my name is', `${f(13, 18, '#FFFFFF')}text-align:center;`, 'align="center"')),
      'width:100%;',
    );
    const so = socialsOf(s);
    const soRow = so.length ? socials(so, A, 14, 8, s, P, { noLogo: true }) : '';
    let body;
    if (two && items.length) {
      /* two columns: the name across the badge, who you are beside how to reach you */
      const L =
        nameRow(s, A, D, P, f(26, 32, P.ink, true, 'letter-spacing:-0.4px;')) +
        altRow(s, P, 14, 20) +
        (s.title ? tr(td(esc(s.title), f(13, 19, acc, true))) : '') +
        (companyLine(s) ? tr(td(esc(companyLine(s)), f(12, 18, P.muted))) : '') +
        (s.team ? tr(td(esc(s.team), f(12, 18, P.muted))) : '');
      body = withPhoto(
        s.show.photo && A.photo ? photoImg(A, 56, s) : '',
        twoCol(
          tbl(L),
          cgrid(items, { one: true, row: 4 }) + (soRow ? `<div style="padding-top:8px;">${soRow}</div>` : ''),
          P,
          { gap: 14 },
        ),
        14,
        { min: 296 },
      );
    } else {
      /* one column: centred like a printed badge */
      const C = 'text-align:center;';

      const ca = 'align="center"';
      let rows = '';
      if (s.show.photo && A.photo) rows += tr(td(tbl(tr(td(photoImg(A, 56, s), IMGTD))), 'padding-bottom:8px;', ca));
      rows += A.hname
        ? tr(td(tbl(nameRow(s, A, D, P, '')), '', ca))
        : nameRow(s, A, D, P, f(26, 32, P.ink, true, 'letter-spacing:-0.4px;') + C, '', ca);
      rows += altRow(s, P, 14, 20, C);
      if (s.title) rows += tr(td(esc(s.title), `${f(13, 19, acc, true) + C}padding-top:2px;`, ca));
      if (companyLine(s) || s.team)
        rows += tr(
          td([s.team, companyLine(s)].filter(Boolean).map(esc).join(' &middot; '), f(12, 18, P.muted) + C, ca),
        );
      if (items.length)
        rows +=
          tr(td('', 'height:8px;font-size:1px;line-height:1px;')) +
          tr(
            td(
              tbl(
                lineRows(items, P, undefined, 300, f(12, 18, P.body) + C, '', 12).replace(
                  /<td style="/g,
                  '<td align="center" style="',
                ),
                'width:100%;',
              ),
              `border-top:1px dashed ${P.dark ? '#5A5A5A' : '#C8C8C8'};padding-top:8px;`,
              ca,
            ),
          );
      if (soRow) rows += tr(td(soRow, `padding-top:6px;${C}`, ca));
      body = tbl(rows, 'width:100%;');
    }
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;border:2px solid ${band};border-radius:14px;">${tr(
      td(top, `background-color:${band};padding:8px 18px 9px 18px;border-radius:11px 11px 0 0;`, `bgcolor="${band}"`),
    )}${tr(td(body, `padding:12px ${two ? 10 : 16}px 12px ${two ? 10 : 16}px;`))}</table>`;
  },
});
