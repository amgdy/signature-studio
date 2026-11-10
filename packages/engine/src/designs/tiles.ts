import {
  addLogo,
  altRow,
  animOn,
  companyLine,
  contactsOf,
  item,
  photoImg,
  photoSpec,
  psz,
  replyContacts,
  socials,
  socialsOf,
  taglineRow,
} from '../content.ts';
import { cgrid, esc, f, hr, img, IMGTD, MS_COLORS, tbl, td, tr } from '../html.ts';
import { GLYPH } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import type { SpecMap } from '../types.ts';

export const tilesDesign = defineDesign({
  id: 'tiles',
  name: 'Fluent Tiles',
  theme: 'msblue',
  anim: 'none',
  cols: 1,
  icons: 'tile',
  cats: ['featured', 'microsoft'],
  badge: 'Featured',
  tag: 'Microsoft tile look, AI sparkle',
  blurb: 'Square photo with the four-colour bar, Microsoft Blue icon tiles and an AI sparkle beside your title.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 29, r: 19, fl: true });
    if (s.show.photo) {
      a.photo = photoSpec(s, th, small ? 44 : 96, 'square', null, 'jpeg', small ? 'none' : this.anim, o, small);
      a.strip = { kind: 'strip', w: psz(s, small ? 44 : 96), h: small ? 3 : 4, colors: MS_COLORS };
    }
    a.spark = { kind: 'anim', which: 'spark', colors: [th.accent], animated: animOn(s, o), motion: s.motion };
    (small ? replyContacts(s) : contactsOf(s)).forEach((c) => {
      a[`ic_${c.k}`] = {
        kind: 'chip',
        icon: GLYPH[c.k],
        size: small ? 14 : 20,
        shape: 'square',
        fill: th.accent,
        fg: '#FFFFFF',
        pad: 0.22,
      };
    });
    if (!small) {
      socialsOf(s).forEach((x) => {
        a[`so_${x.k}`] = {
          kind: 'chip',
          icon: GLYPH[x.k],
          size: 20,
          shape: 'square',
          fill: th.accent,
          fg: '#FFFFFF',
          pad: 0.22,
        };
      });
      addLogo(a, s, 14);
    }
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    let rows = '';
    const small = v === 'reply';
    const two = s.colsEff === 2;
    function left(size: number, stripH: number): string {
      return s.show.photo
        ? tbl(tr(td(photoImg(A, size, s), IMGTD)) + tr(td(img(A.strip, psz(s, size), stripH, ''), IMGTD)))
        : '';
    }
    const titleRow = s.title
      ? tr(
          td(
            tbl(
              tr(
                td(
                  img(A.spark, small ? 14 : 18, small ? 14 : 18, ''),
                  `${IMGTD}padding:0 ${small ? 6 : 8}px 0 0;vertical-align:middle;`,
                  'valign="middle"',
                ) +
                  td(
                    esc(s.title.toUpperCase()),
                    `${f(small ? 11 : 12, small ? 15 : 16, acc, true, `letter-spacing:${small ? 0.6 : 0.8}px;`)}vertical-align:middle;`,
                    'valign="middle"',
                  ),
              ),
            ),
            `padding-top:${small ? 3 : 4}px;`,
          ),
        )
      : '';
    if (small) {
      rows += nameRow(s, A, D, P, f(15, 20, P.ink, true)) + titleRow;
      const it = replyContacts(s).map((c) => item(c, A, P, { size: 14, gap: 6 }));
      const rb = two
        ? twoCol(tbl(rows), cgrid(it, { one: true, row: 3 }), P, { gap: 14 })
        : tbl(rows + (it.length ? tr(td(cgrid(it, { min: 150, gap: 14, row: 0 }), 'padding-top:5px;')) : ''));
      return withPhoto(left(44, 3), rb, 12, { b: 8 });
    }
    rows += nameRow(s, A, D, P, f(22, 28, P.ink, true, 'letter-spacing:-0.3px;')) + altRow(s, P, 15, 21) + titleRow;
    if (s.team) rows += tr(td(esc(s.team), `${f(13, 19, P.body)}padding-top:8px;`));
    if (companyLine(s)) rows += tr(td(esc(companyLine(s)), f(13, 19, P.muted)));
    const cells = contactsOf(s).map((c) => item(c, A, P, { size: 20, gap: 8, lh: 22 }));
    const so = socials(socialsOf(s), A, 20, 4, s, P);
    let body;
    if (two)
      body = twoCol(
        tbl(rows + (so ? tr(td(so, 'padding-top:12px;')) : '') + taglineRow(s, P)),
        cgrid(cells, { one: true, row: 6 }),
        P,
      );
    else {
      rows += tr(td(hr(P.line), 'padding:10px 0 10px 0;'));
      if (cells.length) rows += tr(td(cgrid(cells, { one: s.show.stack, min: 170, gap: 18, row: 6 })));
      if (so) rows += tr(td(so, 'padding-top:4px;'));
      rows += taglineRow(s, P);
      body = tbl(rows);
    }
    // An XL Polaroid and its colour strip need their own row; Outlook cannot float their table.
    if (!two && s.show.photo && s.pscale > 1.4) return tbl(tr(td(left(96, 4), 'padding-bottom:12px;')) + tr(td(body)));
    return withPhoto(left(96, 4), body, 18);
  },
});
