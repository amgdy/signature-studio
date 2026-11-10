import { panelOf, softOn } from '../color.ts';
import {
  addLogo,
  altSpan,
  companyLine,
  contactsOf,
  item,
  logoInline,
  photoImg,
  photoSpec,
  psz,
  replyContacts,
  socialsOf,
  taglineRow,
} from '../content.ts';
import { cgrid, esc, f, flowLine, img, IMGTD, link, nb, renderContext, tbl, td, tr } from '../html.ts';
import { GLYPH, icn } from '../icons.ts';
import { twoCol } from '../layout.ts';
import { handInline, nameAsset } from '../name.ts';
import { defineDesign } from './kit.ts';
import type { SpecMap } from '../types.ts';

export const splitDesign = defineDesign({
  id: 'split',
  name: 'Split Card',
  theme: 'msblue',
  anim: 'none',
  cols: 2,
  icons: 'glyph',
  cats: ['classic'],
  badge: 'New',
  tag: 'Bold colour panel with photo and name',
  blurb:
    'A favourite in signature galleries: a bold colour panel with your photo and name, details beside it (or under it in one column).',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    nameAsset(a, s, th, v, o, {
      n: 24,
      r: 18,
      maxN: s.colsEff === 2 ? (s.cols3 ? 110 : 130) : 200,
      fl: true,
      colorN: '#FFFFFF',
    });
    if (v === 'reply') return a;
    if (s.show.photo) a.photo = photoSpec(s, th, 80, 'circle', { w: 2, gap: 2, color: '#FFFFFF' }, 'png', this.anim, o);
    socialsOf(s).forEach((x) => {
      a[`so_${x.k}`] = { kind: 'glyph', icon: GLYPH[x.k], size: 15, color: '#FFFFFF', onPanel: true };
    });
    contactsOf(s).forEach((c) => {
      a[`ic_${c.k}`] = { kind: 'glyph', icon: GLYPH[c.k], size: 13, color: icn(th) };
    });
    addLogo(a, s, 14);
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const panel = panelOf(th);
    const soft = softOn(panel);
    if (v === 'reply') {
      const bits = replyContacts(s).map((c) =>
        link(c.href, c.k === 'mail' ? esc(c.text) : nb(c.text), c.k === 'mail' ? acc : P.body),
      );
      let inner;
      if (s.colsEff === 2 && s.cols === 2 && bits.length) {
        const L2 =
          (A.hname
            ? tr(td(img(A.hname, D.hname.w, D.hname.h, s.fullName), IMGTD))
            : tr(td(esc(s.fullName), f(14, 19, P.ink, true)))) +
          (s.title ? tr(td(esc(s.title), f(12, 18, P.body))) : '');
        inner = twoCol(
          tbl(L2),
          cgrid(
            bits.map((b) => `<span style="${f(12, 18, P.body)}">${b}</span>`),
            { one: true, row: 2 },
          ),
          P,
          { gap: 14 },
        );
      } else
        inner = tbl(
          (A.hname
            ? tr(td(handInline(A, D, s, s.title ? esc(s.title) : '', f(13, 19, P.body), 13, 19, 10, '|&nbsp;&nbsp;')))
            : tr(
                td(
                  esc(s.fullName) +
                    (s.title ? `<span style="${f(13, 19, P.body)}">&nbsp;&nbsp;| ${esc(s.title)}</span>` : ''),
                  f(14, 19, P.ink, true),
                ),
              )) + (bits.length ? tr(td(flowLine(bits, P), `${f(12, 18, P.body)}padding-top:2px;`)) : ''),
        );
      return tbl(
        tr(
          td(
            '&nbsp;',
            `width:4px;background-color:${panel};font-size:1px;line-height:1px;`,
            `width="4" bgcolor="${panel}"`,
          ) + td(inner, 'padding:2px 0 2px 10px;vertical-align:middle;', 'valign="middle"'),
        ),
      );
    }
    let L = '';
    const so = socialsOf(s);
    if (s.show.photo) L += tr(td(photoImg(A, 80, s), `${IMGTD}padding:0 0 10px 0;`, 'align="center"'));
    if (A.hname) {
      L += tr(td(img(A.hname, D.hname.w, D.hname.h, s.fullName), `${IMGTD}text-align:center;`, 'align="center"'));
      if (s.pronouns) L += tr(td(`(${esc(s.pronouns)})`, `${f(11, 16, soft)}text-align:center;`, 'align="center"'));
    } else
      L += tr(
        td(
          esc(s.fullName) + (s.pronouns ? `<span style="${f(11, 16, soft)}"> (${esc(s.pronouns)})</span>` : ''),
          `${f(16, 21, '#FFFFFF', true)}text-align:center;`,
          'align="center"',
        ),
      );
    if (s.altName) L += tr(td(altSpan(s), `${f(13, 19, '#FFFFFF', true)}text-align:center;`, 'align="center"'));
    if (s.title) L += tr(td(esc(s.title), `${f(12, 16, soft)}text-align:center;padding-top:2px;`, 'align="center"'));
    if (so.length)
      L += tr(
        td(
          A[`so_${so[0].k}`]
            ? so
                .map((x) =>
                  link(
                    x.href,
                    img(A[`so_${x.k}`], 15, 15, x.label, { inline: true, css: 'margin:0 5px;' }),
                    '#FFFFFF',
                    '',
                    x.label,
                  ),
                )
                .join('')
            : so
                .map((x) => `<span style="white-space:nowrap;">${link(x.href, nb(x.label), '#FFFFFF')}</span>`)
                .join(`<span style="color:${soft};"> &middot;</span> `),
          `${f(12, 18, '#FFFFFF')}padding-top:10px;text-align:center;`,
          'align="center"',
        ),
      );
    let R = '';
    const cs = contactsOf(s).map((c) => item(c, A, P, s.cols3 ? { size: 12, gap: 4 } : { size: 13, gap: 8 }));
    if (s.team) R += tr(td(esc(s.team), f(13, 19, P.ink, true)));
    if (companyLine(s)) R += tr(td(esc(companyLine(s)), f(12, 18, P.muted)));
    if (cs.length) R += tr(td(cgrid(cs, { one: true, row: 4 }), 'padding-top:10px;'));
    if (s.show.logo && A.logo) R += tr(td(logoInline(A, s, 14, P, 12), 'padding-top:12px;'));
    R += taglineRow(s, P);
    const W = Math.max(250, A.hname ? D.hname.w + 28 : 0);
    if (s.colsEff === 1) {
      return tbl(
        tr(
          td(
            tbl(L, 'width:100%;'),
            `background-color:${panel};padding:18px 14px;text-align:center;vertical-align:middle;`,
            `bgcolor="${panel}" align="center" valign="middle"`,
          ),
        ) +
          tr(
            td(tbl(R), `padding:14px 18px;border:1px solid ${P.line};border-top:0;vertical-align:top;`, 'valign="top"'),
          ),
        `width:${W}px;`,
      );
    }
    /* side by side with equal heights (a shared minimum height); on narrow screens the details move under the panel */
    const hL =
      32 +
      (s.show.photo ? psz(s, 80) + 10 : 0) +
      (A.hname ? D.hname.h + (s.pronouns ? 16 : 0) : 21) +
      (s.altName ? 19 : 0) +
      (s.title ? 18 : 0) +
      (so.length ? 28 : 0);
    const hR =
      32 +
      (s.team ? 19 : 0) +
      (companyLine(s) ? 18 : 0) +
      (cs.length ? 10 + cs.length * 18 + (cs.length - 1) * 4 : 0) +
      (s.show.logo && A.logo ? 30 : 0) +
      (s.show.tagline && s.tagline ? 26 : 0);
    const H = Math.max(hL, hR) + 4;
    const padX = renderContext.customTypography ? 5 : s.cols3 ? (s.pscale > 1 ? 5 : 7) : 12;
    function box(inner: string, css: string, attrs: string): string {
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;"><tr><td ${attrs} height="${H}" style="height:${H}px;padding:16px ${padX}px;vertical-align:middle;${css}">${inner}</td></tr></table>`;
    }
    /* two cells that share the width; on a phone the text inside them wraps */
    const W1 = A.hname ? D.hname.w + padX * 2 : s.cols3 ? 150 : 170;
    return tbl(
      tr(
        td(
          box(
            tbl(L, 'width:100%;'),
            `background-color:${panel};text-align:center;`,
            `bgcolor="${panel}" align="center" valign="middle"`,
          ),
          `vertical-align:top;width:${W1}px;`,
          `valign="top" width="${W1}"`,
        ) +
          td(
            box(tbl(R), `border:1px solid ${P.line};border-left:0;word-break:break-word;`, 'valign="middle"'),
            'vertical-align:top;width:240px;',
            'valign="top" width="240"',
          ),
      ),
    );
  },
});
