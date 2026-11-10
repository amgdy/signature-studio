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
import { cgrid, esc, f, flowLine, img, IMGTD, tbl, td, tr } from '../html.ts';
import { GLYPH, iconFor } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import type { SpecMap } from '../types.ts';

export const auroraDesign = defineDesign({
  id: 'aurora',
  name: 'Aurora',
  theme: 'aurora',
  anim: 'spin',
  cols: 1,
  icons: 'fluent',
  cats: ['featured', 'microsoft'],
  badge: 'Featured',
  tag: 'Spinning gradient ring, colour-coded icons',
  blurb:
    'Your photo in a spinning gradient ring, clear colour-coded contact icons, round link buttons and a shimmer line.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    nameAsset(a, s, th, v, o, { n: 28, r: 19, fl: true, maxN: 200 });
    if (v === 'reply') {
      if (s.show.photo)
        a.photo = photoSpec(s, th, 44, 'circle', { w: 2, gap: 2, stops: th.stops }, 'png', 'none', o, true);
      replyContacts(s).forEach((c) => {
        a[`ic_${c.k}`] = iconFor('fluent', c.k, 14, th, o);
      });
      return a;
    }
    if (s.show.photo) {
      a.photo = photoSpec(s, th, 96, 'circle', { w: 3, gap: 3, stops: th.stops }, 'png', this.anim, o);
      a.divider = { kind: 'vbar', w: 2, h: psz(s, 96), stops: th.stops };
    }
    a.shimmer = { kind: 'anim', which: 'bar', colors: th.stops, animated: animOn(s, o), motion: s.motion };
    contactsOf(s).forEach((c) => {
      a[`ic_${c.k}`] = iconFor('fluent', c.k, 16, th, o);
    });
    socialsOf(s).forEach((x) => {
      a[`so_${x.k}`] = {
        kind: 'chip',
        icon: GLYPH[x.k],
        size: 22,
        shape: 'circle',
        fill: th.stops,
        fg: '#FFFFFF',
        pad: 0.27,
      };
    });
    addLogo(a, s, 14);
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    let rows = '';
    const two = s.colsEff === 2;
    if (v === 'reply') {
      rows += nameRow(s, A, D, P, f(15, 20, P.ink, true));
      if (s.title)
        rows += tr(
          td(
            esc(s.title) +
              (companyLine(s) ? `<span style="${f(12, 17, P.muted)}"> &middot; ${esc(companyLine(s))}</span>` : ''),
            f(12, 17, acc, true),
          ),
        );
      const it = replyContacts(s).map((c) => item(c, A, P, { size: 14, gap: 5 }));
      const rb = two
        ? twoCol(tbl(rows), cgrid(it, { one: true, row: 3 }), P, { gap: 14 })
        : tbl(rows + (it.length ? tr(td(flowLine(it, P), `${f(12, 18, P.body)}padding-top:4px;`)) : ''));
      return withPhoto(s.show.photo ? photoImg(A, 44, s) : '', rb, 12, { b: 8 });
    }
    rows += nameRow(s, A, D, P, f(20, 26, P.ink, true, 'letter-spacing:-0.2px;'));
    rows += altRow(s, P, 15, 21);
    if (s.title) rows += tr(td(esc(s.title), `${f(14, 20, acc, true)}padding-top:2px;`));
    const org = [s.team, companyLine(s)].filter(Boolean).map(esc).join(' &middot; ');
    if (org) rows += tr(td(org, `${f(12, 18, P.muted)}padding-top:2px;`));
    rows += tr(td(img(A.shimmer, two ? 100 : 200, two ? 3 : 6, ''), `${IMGTD}padding:9px 0 9px 0;`));
    const cells = contactsOf(s).map((c) => item(c, A, P, { size: 16, gap: 6 }));
    const so = socials(socialsOf(s), A, 22, 6, s, P);
    let body;
    if (two)
      body = twoCol(
        tbl(rows + (so ? tr(td(so, 'padding-top:2px;')) : '') + taglineRow(s, P)),
        cgrid(cells, { one: true, row: 6 }),
        P,
      );
    else {
      if (cells.length) rows += tr(td(cgrid(cells, { one: s.show.stack, min: 170, gap: 18, row: 5 })));
      if (so) rows += tr(td(so, 'padding-top:7px;'));
      rows += taglineRow(s, P);
      body = tbl(rows);
    }
    /* the gradient divider leads the details, so on a phone it stays beside them rather than beside the photo */
    if (s.show.photo && !two)
      body = tbl(
        tr(
          td(
            img(A.divider, 2, psz(s, 96), ''),
            `${IMGTD}width:2px;padding:0 16px 0 0;vertical-align:top;`,
            'valign="top" width="18"',
          ) + td(body, 'vertical-align:top;', 'valign="top"'),
        ),
      );
    return withPhoto(s.show.photo ? photoImg(A, 96, s) : '', body, 16);
  },
});
