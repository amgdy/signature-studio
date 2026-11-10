import {
  addLogo,
  altRow,
  companyLine,
  contactsOf,
  item,
  logoAlt,
  photoImg,
  photoSpec,
  replyContacts,
  socials,
  socialsOf,
  taglineRow,
} from '../content.ts';
import { cgrid, esc, f, flowLine, img, link, nb, tbl, td, tr } from '../html.ts';
import { GLYPH, icn, wantIcons } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import type { Contact } from '../content.ts';
import type { SpecMap } from '../types.ts';

export const executiveDesign = defineDesign({
  id: 'executive',
  name: 'Executive',
  theme: 'msblue',
  anim: 'none',
  cols: 1,
  icons: 'labels',
  cats: ['leadership', 'microsoft'],
  badge: '',
  tag: 'Leadership text block with your logo',
  blurb: 'A calm leadership-style text block: name, role, labelled contact lines and your logo with the company name.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    nameAsset(a, s, th, v, o, { n: 24, r: 18, fl: true });
    if (wantIcons(s))
      (v === 'reply' ? replyContacts(s) : contactsOf(s)).forEach((c) => {
        a[`ic_${c.k}`] = { kind: 'glyph', icon: GLYPH[c.k], size: v === 'reply' ? 12 : 14, color: icn(th) };
      });
    if (v === 'reply') return a;
    if (s.show.photo) a.photo = photoSpec(s, th, 80, 'circle', null, 'png', this.anim, o);
    socialsOf(s).forEach((x) => {
      a[`so_${x.k}`] = { kind: 'glyph', icon: GLYPH[x.k], size: 18, color: icn(th) };
    });
    addLogo(a, s, 20);
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    let rows = '';
    const two = s.colsEff === 2;
    /* "Mobile: ..." style lines, or icon + value when an icon style is chosen */
    function lineOf(c: Contact, small: boolean) {
      const col = /^(mail|web|calendar)$/.test(c.k) ? acc : P.body;
      if (A[`ic_${c.k}`])
        return item(c, A, P, {
          size: small ? 12 : 14,
          gap: 6,
          fs: small ? 12 : 13,
          lh: small ? 18 : 19,
          linkColor: col,
        });
      const txt = c.k === 'phone' || c.k === 'office' ? nb(c.text) : esc(c.text);
      let val = c.href ? link(c.href, txt, col) : txt;
      if (/^(phone|office|hours|languages)$/.test(c.k))
        val = `<span style="color:${P.muted};">${esc(c.label)}:</span> ${val}`;
      return val;
    }
    if (v === 'reply') {
      rows += nameRow(s, A, D, P, f(14, 19, P.ink, true), '', '', true);
      const rc = replyContacts(s).map((c) => lineOf(c, true));
      if (two) {
        if (s.title) rows += tr(td(esc(s.title), f(12, 18, P.body)));
        if (companyLine(s)) rows += tr(td(esc(companyLine(s)), f(12, 18, P.muted)));
        return twoCol(
          tbl(rows),
          cgrid(
            rc.map((x) => `<span style="${f(12, 18, P.body)}">${x}</span>`),
            { one: true, row: 0 },
          ),
          P,
          { gap: 14 },
        );
      }
      const l2 = flowLine([s.title ? esc(s.title) : '', companyLine(s) ? esc(companyLine(s)) : ''], P, '|');
      if (l2) rows += tr(td(l2, f(12, 18, P.body)));
      if (rc.length) rows += tr(td(flowLine(rc, P, '|'), f(12, 18, P.body)));
      return tbl(rows);
    }
    rows += nameRow(s, A, D, P, f(16, 22, P.ink, true));
    rows += altRow(s, P, 14, 20);
    if (s.title) rows += tr(td(esc(s.title), f(13, 19, P.body)));
    if (s.team) rows += tr(td(esc(s.team), f(13, 19, P.muted)));
    if (companyLine(s)) rows += tr(td(esc(companyLine(s)), f(13, 19, P.muted)));
    const lines = contactsOf(s).map((c) => lineOf(c, false));
    const soRow = socials(socialsOf(s), A, 18, 10, s, P, { noLogo: true });
    const company = s.company.trim();
    const logo =
      s.show.logo && A.logo
        ? `<span style="white-space:nowrap;">${img(A.logo, 20, 20, company ? '' : logoAlt(s), { inline: true, css: 'margin:0 7px 3px 0;' })}${company ? `<span style="${f(18, 22, P.logoText, true, 'letter-spacing:-0.2px;')}">${esc(company)}</span>` : ''}</span>`
        : '';
    let body;
    if (two) {
      if (logo) rows += tr(td(logo, 'padding-top:12px;'));
      body = twoCol(
        tbl(rows),
        cgrid(
          lines.map((l) => `<span style="${f(13, 19, P.body)}">${l}</span>`),
          { one: true, row: 0 },
        ) + (soRow ? `<div style="padding-top:${lines.length ? 10 : 0}px;">${soRow}</div>` : ''),
        P,
        { gap: 18 },
      );
      if (s.show.tagline && s.tagline)
        body = tbl(
          tr(td(body)) + tr(td(esc(s.tagline), `${f(12, 18, P.muted, false, 'font-style:italic;')}padding-top:10px;`)),
        );
    } else {
      lines.forEach((l, i) => {
        rows += tr(td(l, f(13, 19, P.body) + (i ? '' : 'padding-top:10px;')));
      });
      if (soRow) rows += tr(td(soRow, 'padding-top:10px;'));
      rows += taglineRow(s, P);
      if (logo) rows += tr(td(logo, 'padding-top:14px;'));
      body = tbl(rows);
    }
    return withPhoto(s.show.photo ? photoImg(A, 80, s) : '', body, 16, { t: 2 });
  },
});
