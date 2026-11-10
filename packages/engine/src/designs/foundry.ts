import {
  addLogo,
  altRow,
  animOn,
  companyLine,
  contactsOf,
  item,
  photoImg,
  photoSpec,
  replyContacts,
  socials,
  socialsOf,
  taglineRow,
} from '../content.ts';
import { cgrid, esc, f, img, IMGTD, tbl, td, tr } from '../html.ts';
import { GLYPH } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import type { SpecMap } from '../types.ts';

export const foundryDesign = defineDesign({
  id: 'foundry',
  name: 'Foundry Mesh',
  theme: 'foundry',
  anim: 'sweep',
  cols: 1,
  icons: 'rounded',
  cats: ['azure'],
  badge: 'New',
  tag: 'Live agent mesh, glowing ring',
  blurb: 'Inspired by Microsoft Foundry: a live agent-mesh header, a glowing ring sweep and rounded icon chips.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    nameAsset(a, s, th, v, o, { n: 28, r: 19, fl: true, maxN: 200 });
    if (v === 'reply') {
      if (s.show.photo)
        a.photo = photoSpec(s, th, 40, 'circle', { w: 2, gap: 2, stops: th.stops }, 'png', 'none', o, true);
      replyContacts(s).forEach((c) => {
        a[`ic_${c.k}`] = {
          kind: 'chip',
          icon: GLYPH[c.k],
          size: 16,
          shape: 'rounded',
          fill: th.stops,
          fg: '#FFFFFF',
          pad: 0.24,
        };
      });
      return a;
    }
    if (s.show.photo) a.photo = photoSpec(s, th, 92, 'circle', { w: 3, gap: 3, stops: th.stops }, 'png', this.anim, o);
    a.mesh = {
      kind: 'mesh',
      w: 220,
      h: 28,
      stops: th.stops,
      accent: th.accent,
      animated: animOn(s, o),
      motion: s.motion,
    };
    contactsOf(s).forEach((c) => {
      a[`ic_${c.k}`] = {
        kind: 'chip',
        icon: GLYPH[c.k],
        size: 20,
        shape: 'rounded',
        fill: th.stops,
        fg: '#FFFFFF',
        pad: 0.24,
      };
    });
    socialsOf(s).forEach((x) => {
      a[`so_${x.k}`] = {
        kind: 'chip',
        icon: GLYPH[x.k],
        size: 22,
        shape: 'rounded',
        fill: th.stops,
        fg: '#FFFFFF',
        pad: 0.26,
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
      const it = replyContacts(s).map((c) => item(c, A, P, { size: 16, gap: 6 }));
      const rb = two
        ? twoCol(tbl(rows), cgrid(it, { one: true, row: 3 }), P, { gap: 14 })
        : tbl(rows + (it.length ? tr(td(cgrid(it, { min: 150, gap: 14, row: 0 }), 'padding-top:4px;')) : ''));
      return withPhoto(s.show.photo ? photoImg(A, 40, s) : '', rb, 12, { b: 8 });
    }
    const mesh = tr(td(img(A.mesh, 220, 28, ''), `${IMGTD}padding:0 0 8px 0;`));
    rows += nameRow(s, A, D, P, f(21, 27, P.ink, true, 'letter-spacing:-0.3px;'));
    rows += altRow(s, P, 15, 21);
    if (s.title) rows += tr(td(esc(s.title), f(14, 20, acc, true)));
    const org = [s.team, companyLine(s)].filter(Boolean).map(esc).join(' &middot; ');
    if (org) rows += tr(td(org, f(12, 18, P.muted)));
    const cells = contactsOf(s).map((c) => item(c, A, P, { size: 20, gap: 8, lh: 22 }));
    const so = socials(socialsOf(s), A, 22, 6, s, P);
    let body;
    if (two)
      body = twoCol(
        tbl(mesh + rows + (so ? tr(td(so, 'padding-top:12px;')) : '') + taglineRow(s, P)),
        cgrid(cells, { one: true, row: 6 }),
        P,
      );
    else {
      rows = mesh + rows;
      if (cells.length)
        rows += tr(td(cgrid(cells, { one: s.show.stack, min: 170, gap: 18, row: 6 }), 'padding-top:12px;'));
      if (so) rows += tr(td(so, 'padding-top:6px;'));
      rows += taglineRow(s, P);
      body = tbl(rows);
    }
    return withPhoto(s.show.photo ? photoImg(A, 92, s) : '', body, 18, { t: 6 });
  },
});
