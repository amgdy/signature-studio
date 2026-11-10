import {
  addLogo,
  altRow,
  animOn,
  companyLine,
  contactsOf,
  item,
  logoInline,
  photoImg,
  photoSpec,
  replyContacts,
  socials,
  socialsOf,
  taglineRow,
} from '../content.ts';
import { cgrid, esc, f, flowLine, img, IMGTD, lineRows, link, nb, tbl, td, tr } from '../html.ts';
import { GLYPH, icn, wantIcons } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { handFit, handSpec } from '../name.ts';
import { defineDesign } from './kit.ts';
import type { SpecMap } from '../types.ts';

export const scriptDesign = defineDesign({
  id: 'script',
  name: 'Handwritten',
  theme: 'msblue',
  anim: 'none',
  cols: 1,
  icons: 'glyph',
  cats: ['classic'],
  badge: 'New',
  handAlways: true,
  tag: 'Your name, written by hand, beside your photo',
  blurb:
    'Your name is written stroke by stroke with a real pen nib when the email opens, beside your photo and above clean contact lines. Pick the handwriting and pen.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    a.script = handSpec(
      s,
      th,
      handFit(s, small ? 22 : 38, small ? 190 : 230, !small && s.show.flourish),
      !small && animOn(s, o),
      !small && s.show.flourish,
    );
    if (!small && s.show.photo)
      a.photo = photoSpec(s, th, 84, 'circle', { w: 2, gap: 3, stops: th.stops }, 'png', this.anim, o);
    if (!small) {
      contactsOf(s).forEach((c) => {
        a[`ic_${c.k}`] = { kind: 'glyph', icon: GLYPH[c.k], size: 12, color: icn(th) };
      });
      if (wantIcons(s))
        socialsOf(s).forEach((x) => {
          a[`so_${x.k}`] = { kind: 'glyph', icon: GLYPH[x.k], size: 14, color: icn(th) };
        });
      addLogo(a, s, 13);
    }
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    let rows = '';
    const d = D.script;
    const two = s.colsEff === 2;
    rows += tr(td(img(A.script, d.w, d.h, s.fullName), IMGTD));
    const line =
      (s.title ? `<span style="${f(13, 19, P.ink, true)}">${esc(s.title)}</span>` : '') +
      (companyLine(s) ? `<span style="${f(13, 19, P.muted)}">&nbsp;&nbsp;| ${esc(companyLine(s))}</span>` : '');
    if (v === 'reply') {
      const bits = replyContacts(s).map((c) =>
        link(c.href, c.k === 'mail' ? esc(c.text) : nb(c.text), c.k === 'mail' ? acc : P.body),
      );
      if (two && bits.length)
        return tbl(
          rows +
            tr(
              td(
                twoCol(
                  line ? tbl(tr(td(line, f(13, 19, P.ink)))) : '',
                  cgrid(
                    bits.map((b) => `<span style="${f(12, 18, P.body)}">${b}</span>`),
                    { one: true, row: 2 },
                  ),
                  P,
                  { gap: 14 },
                ),
              ),
            ),
        );
      if (line) rows += tr(td(line, f(13, 19, P.ink)));
      if (bits.length) rows += tr(td(flowLine(bits, P), f(12, 18, P.body)));
      return tbl(rows);
    }
    rows += altRow(s, P, 14, 20);
    const cs = contactsOf(s).map((c) => item(c, A, P, { size: 12, gap: 5 }));
    const so = socialsOf(s);

    /* text links wrap between links on a narrow screen; a row of icons stays together */
    const lg = s.show.logo && A.logo ? logoInline(A, s, 13, P, 12) : '';

    const iconsOn = so.length && A[`so_${so[0].k}`];
    const tail = iconsOn
      ? flowLine([socials(so, A, 14, 8, s, P, { noLogo: true }), lg], P, '')
      : flowLine(so.map((x) => link(x.href, nb(x.label), acc)).concat([lg]), P);
    if (two) {
      const L =
        (s.title ? tr(td(esc(s.title), f(13, 19, P.ink, true))) : '') +
        (companyLine(s) ? tr(td(esc(companyLine(s)), f(13, 19, P.muted))) : '') +
        (s.team ? tr(td(esc(s.team), f(12, 18, P.muted))) : '') +
        taglineRow(s, P);
      const tail2 = iconsOn
        ? socials(so, A, 14, 8, s, P, { noLogo: true })
        : flowLine(
            so.map((x) => link(x.href, nb(x.label), acc)),
            P,
          );
      return tbl(
        tr(td(withPhoto(s.show.photo && A.photo ? photoImg(A, 84, s) : '', tbl(rows), 18))) +
          tr(
            td(
              twoCol(
                tbl(L),
                cgrid(cs, { one: true, row: 3 }) +
                  (tail2 ? `<div style="${f(12, 18, acc)}padding-top:8px;">${tail2}</div>` : '') +
                  (lg ? `<div style="padding-top:8px;white-space:nowrap;">${lg}</div>` : ''),
                P,
                { gap: 16, noHead: true },
              ),
              'padding-top:12px;',
            ),
          ),
      );
    } else {
      if (line) rows += tr(td(line, `${f(13, 19, P.ink)}padding-top:2px;`));
      if (s.team) rows += tr(td(esc(s.team), f(12, 18, P.muted)));
      if (cs.length) rows += lineRows(cs, P, undefined, 430, f(12, 18, P.body), 'padding-top:10px;');
      if (tail) rows += tr(td(tail, `${f(12, 18, acc)}padding-top:10px;`));
      rows += taglineRow(s, P);
    }
    return withPhoto(s.show.photo && A.photo ? photoImg(A, 84, s) : '', tbl(rows), 18);
  },
});
