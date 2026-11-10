import { addLogo, altSpan, companyLine, logoAlt, pron, socialsOf, taglineRow } from '../content.ts';
import { cgrid, esc, f, flowLine, img, IMGTD, lineRows, link, nb, pretty, tbl, td, telOf, tr, url } from '../html.ts';
import { twoCol } from '../layout.ts';
import { handInline, handPb, nameAsset } from '../name.ts';
import { defineDesign } from './kit.ts';
import type { SpecMap } from '../types.ts';

export const minimalDesign = defineDesign({
  id: 'minimal',
  name: 'Minimal',
  theme: 'msblue',
  anim: 'none',
  cols: 1,
  icons: 'labels',
  cats: ['classic'],
  badge: '',
  tag: 'Two quiet lines',
  blurb: 'Two quiet lines; its reply version is a single line.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    nameAsset(a, s, th, v, o, { n: 20, r: 18 });
    addLogo(a, s, 12);
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const small = v === 'reply';

    const nameHtml = `<span style="${f(13, 19, P.ink, true)}">${esc(s.fullName)}</span>${pron(s, P)}${s.altName && !small ? `&nbsp; <span style="${f(13, 19, P.body, true)}">${altSpan(s)}</span>` : ''}`;

    const parts = [];
    if (s.title) parts.push(`<span style="${f(13, 19, P.body)}">${esc(s.title)}</span>`);
    if (companyLine(s))
      parts.push(`<span style="${f(13, 19, P.muted)}">${esc(small ? s.company : companyLine(s))}</span>`);
    const bits = [];
    if (s.phone) bits.push(link(telOf(s), nb(s.phone), P.muted));
    if (s.office) bits.push(link(telOf(s, s.office), nb(s.office), P.muted));
    if (s.email) bits.push(link(`mailto:${s.email.trim()}`, esc(s.email.trim()), acc));
    if (!small) {
      if (s.website && s.show.website) bits.push(link(url(s.website), esc(pretty(s.website)), acc));
      if (s.hours) bits.push(esc(s.hours));
      if (s.languages) bits.push(esc(s.languages));
      socialsOf(s)
        .filter((x) => x.k !== 'teams')
        .forEach((x) => {
          bits.push(link(x.href, nb(x.label), acc));
        });
    }
    const logo =
      s.show.logo && A.logo ? img(A.logo, 12, 12, logoAlt(s), { inline: true, css: 'margin:0 8px 3px 0;' }) : '';
    function line(rest: string[]) {
      if (!A.hname) return tbl(tr(td(logo + flowLine([nameHtml].concat(rest), P, '|'), f(13, 19, P.body))));
      const lg = logo
        ? td(
            img(A.logo, 12, 12, logoAlt(s)),
            `${IMGTD}padding:0 8px ${handPb(D, 13, 19) + 4}px 0;vertical-align:bottom;`,
            'valign="bottom"',
          )
        : '';
      const pr = pron(s, P).replace(/^ /, '');
      const sepH = `<span style="color:${P.faint};">|</span>&nbsp; `;
      const fl2 = rest.length ? flowLine(rest, P, '|') : '';
      return tbl(
        tr(
          lg +
            td(
              handInline(
                A,
                D,
                s,
                pr ? pr + (fl2 ? `&nbsp;${sepH}${fl2}` : '') : fl2,
                f(13, 19, P.body),
                13,
                19,
                6,
                pr || !fl2 ? '' : sepH,
              ),
              'vertical-align:bottom;',
              'valign="bottom"',
            ),
        ),
      );
    }
    if (s.colsEff === 2) {
      const L =
        tr(td(line([]))) +
        (s.title ? tr(td(esc(s.title), f(13, 19, P.body))) : '') +
        (companyLine(s) ? tr(td(esc(small ? s.company : companyLine(s)), f(13, 19, P.muted))) : '') +
        (small ? '' : taglineRow(s, P, 'padding-top:4px;'));
      return twoCol(
        tbl(L),
        cgrid(
          bits.map((b) => `<span style="${f(12, 18, P.muted)}white-space:nowrap;">${b}</span>`),
          { one: true, row: 1 },
        ),
        P,
        { gap: 14 },
      );
    }
    if (small && !A.hname)
      return tbl(tr(td(line(parts.concat(bits.map((b) => `<span style="${f(12, 19, P.muted)}">${b}</span>`))))));
    let rows = tr(td(line(parts)));
    if (bits.length) rows += lineRows(bits, P, undefined, 520, f(12, 18, P.muted), 'padding-top:2px;');
    if (!small) rows += taglineRow(s, P, 'padding-top:4px;');
    return tbl(rows);
  },
});
