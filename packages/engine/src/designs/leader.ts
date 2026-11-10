import {
  addLogo,
  altRow,
  companyLine,
  contactsOf,
  ctasOf,
  eyebrowOf,
  focusOf,
  item,
  logoInline,
  photoImg,
  photoSpec,
  replyContacts,
  taglineRow,
} from '../content.ts';
import { cgrid, esc, f, flowLine, img, IMGTD, link, renderContext, tbl, td, tr } from '../html.ts';
import { GLYPH, icn } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { handInline, nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import type { SpecMap } from '../types.ts';

export const leaderDesign = defineDesign({
  id: 'leader',
  name: 'Leadership',
  theme: 'executive',
  anim: 'orbit',
  cols: 1,
  icons: 'glyph',
  extras: ['focus'],
  cats: ['featured', 'leadership', 'microsoft'],
  badge: 'Leadership',
  tag: 'What you lead, orbiting ring, action buttons',
  blurb: 'Made for leads: a team eyebrow, the areas you lead, an orbiting photo ring and one-click buttons.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    nameAsset(a, s, th, v, o, { n: 31, r: 18, fl: true });
    if (v === 'reply') {
      if (s.show.photo)
        a.photo = photoSpec(s, th, 44, 'circle', { w: 2, gap: 2, stops: th.stops }, 'png', 'none', o, true);
      replyContacts(s).forEach((c) => {
        a[`ic_${c.k}`] = { kind: 'glyph', icon: GLYPH[c.k], size: 12, color: icn(th) };
      });
      return a;
    }
    if (s.show.photo) a.photo = photoSpec(s, th, 96, 'circle', { w: 3, gap: 4, stops: th.stops }, 'png', this.anim, o);
    a.rule = { kind: 'hbar', w: s.colsEff === 2 ? 100 : 200, h: 2, stops: th.stops };
    contactsOf(s).forEach((c) => {
      a[`ic_${c.k}`] = { kind: 'glyph', icon: GLYPH[c.k], size: 13, color: icn(th) };
    });
    ctasOf(s).forEach((c, i) => {
      a[`cta_${c.k}`] = {
        kind: 'button',
        text: c.label,
        icon: c.icon,
        h: 28,
        fill: i === 0 ? th.stops.slice(0, 2) : null,
        fg: i === 0 ? '#FFFFFF' : th.accent,
        outline: i === 0 ? null : th.accent,
      };
    });
    addLogo(a, s, 16);
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    let rows = '';
    const eb = eyebrowOf(s);
    const two = s.colsEff === 2;
    if (v === 'reply') {
      if (eb) rows += tr(td(esc(eb), f(11, 15, acc, true, 'letter-spacing:1px;')));
      if (A.hname)
        rows += tr(
          td(
            handInline(A, D, s, s.title ? esc(s.title) : '', f(13, 19, P.body), 13, 19, 10, '|&nbsp;&nbsp;'),
            'padding-top:2px;',
          ),
        );
      else
        rows += tr(
          td(
            esc(s.fullName) +
              (s.title ? `<span style="${f(13, 19, P.body)}">&nbsp;&nbsp;| ${esc(s.title)}</span>` : ''),
            `${f(14, 19, P.ink, true)}padding-top:2px;`,
          ),
        );
      const it = replyContacts(s).map((c) => item(c, A, P, { size: 12, gap: 5 }));
      const rb = two
        ? twoCol(tbl(rows), cgrid(it, { one: true, row: 3 }), P, { gap: 14 })
        : tbl(rows + (it.length ? tr(td(flowLine(it, P), `${f(12, 18, P.body)}padding-top:3px;`)) : ''));
      return withPhoto(s.show.photo ? photoImg(A, 44, s) : '', rb, 12, { b: 8 });
    }
    if (eb) rows += tr(td(esc(eb), f(11, 15, acc, true, 'letter-spacing:1.3px;')));
    rows += nameRow(s, A, D, P, f(24, 30, P.ink, true, 'letter-spacing:-0.4px;'), 'padding-top:4px;');
    rows += altRow(s, P, 16, 22);
    if (s.title) rows += tr(td(esc(s.title), f(15, 21, P.body, true)));
    if (companyLine(s)) rows += tr(td(esc(companyLine(s)), f(13, 19, P.muted)));
    rows += tr(td(img(A.rule, two ? 100 : 200, 2, ''), `${IMGTD}padding:12px 0 10px 0;`));
    const lead = focusOf(s);
    /* in three columns the left column is narrow on a phone, so an area may wrap inside itself there */
    const whole = s.cols3 ? '' : 'white-space:nowrap;';
    if (lead.length)
      rows += tr(
        td(
          `<span style="color:${P.muted};">${esc(s.focusLabel || 'Leading')}</span>${renderContext.customTypography ? ' ' : '&nbsp; '}${lead
            .map((x) => (whole ? `<span style="${whole}">${esc(x)}</span>` : esc(x)))
            .join(
              `<span style="color:${acc};">${renderContext.customTypography ? ' &bull; ' : '&nbsp;&nbsp;&bull;&nbsp;'}</span> `,
            )}`,
          f(12, 18, P.body),
        ),
      );
    const cells = contactsOf(s).map((c) => item(c, A, P, { size: 13, gap: 5 }));
    const ctas = ctasOf(s);
    const btns = ctas
      .map((c) => {
        const d = D[`cta_${c.k}`];
        return link(c.href, img(A[`cta_${c.k}`], d.w, d.h, c.label, { inline: true, css: 'margin:0 8px 8px 0;' }), acc);
      })
      .join(' ');
    let actions =
      btns +
      (s.show.logo && A.logo
        ? (two ? '<div style="padding:0 0 8px 0;">' : '<span style="display:inline-block;padding:0 0 8px 0;">') +
          logoInline(A, s, 16, P, 13) +
          (two ? '</div>' : '</span>')
        : '');
    if (actions) actions = `<div style="${f(13, 28, P.body)}">${actions}</div>`;
    let body;
    if (two) {
      rows += taglineRow(s, P);
      body = twoCol(
        tbl(rows),
        cgrid(cells, { one: true, row: 4 }) + (actions ? `<div style="padding-top:12px;">${actions}</div>` : ''),
        P,
        { gap: 20, lw: Math.min(260, Math.max(240, A.hname ? D.hname.w : 0)) },
      );
    } else {
      if (cells.length)
        rows += tr(td(cgrid(cells, { one: s.show.stack, min: 200, gap: 14, row: 3 }), 'padding-top:8px;'));
      if (actions) rows += tr(td(actions, 'padding-top:11px;'));
      rows += taglineRow(s, P);
      body = tbl(rows);
    }
    return withPhoto(s.show.photo ? photoImg(A, 96, s) : '', body, 18);
  },
});
