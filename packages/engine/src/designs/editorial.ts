import { altRow, companyLine, contactsOf, item, photoImg, photoSpec, replyContacts, socialsOf } from '../content.ts';
import { cgrid, esc, f, flowLine, link, nb, renderContext, SERIF, tbl, td, tr } from '../html.ts';
import { wantIcons } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import { iconSpecs, textLinks } from './shared.ts';
import type { SpecMap } from '../types.ts';

/* a thin row that draws a horizontal rule */
function rule(css: string): string {
  return tr(td('&nbsp;', `font-size:1px;line-height:1px;${css}`));
}

export const editorialDesign = defineDesign({
  id: 'editorial',
  name: 'Masthead',
  theme: 'sage',
  anim: 'none',
  cols: 1,
  icons: 'labels',
  cats: ['anyrole', 'classic'],
  badge: 'New',
  tag: 'Serif masthead between fine rules',
  blurb:
    'Calm and editorial: your name as a serif masthead under a double rule, your role in small capitals, one row of text links and, if you add working hours, a note that sets reply expectations. Suits law, finance, academia, hospitality and publishing.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 26, r: 19, maxN: 210 });
    if (s.show.photo && !small) a.photo = photoSpec(s, th, 64, 'circle', null, 'png', this.anim, o);
    if (wantIcons(s)) iconSpecs(a, s, th, small ? replyContacts(s) : contactsOf(s), false, 12, 'glyph');
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const small = v === 'reply';
    const two = s.colsEff === 2;
    let rows = '';
    const serifName = f(small ? 17 : 24, small ? 22 : 30, P.ink, false, `font-family:${SERIF};letter-spacing:0.3px;`);
    if (!small) rows += rule(`border-top:3px double ${acc};height:4px;`);
    rows += nameRow(s, A, D, P, serifName, small ? '' : 'padding-top:6px;');
    const caps = [s.title, small ? '' : s.team]
      .filter(Boolean)
      .map((x) => esc(x.toUpperCase()))
      .join(' &nbsp;&middot;&nbsp; ');
    if (caps) rows += tr(td(caps, `${f(11, 16, acc, true, 'letter-spacing:1.3px;')}padding-top:3px;`));
    if (!small) rows += altRow(s, P, 14, 20);
    if (!small) rows += rule(`border-top:1px solid ${P.line};height:1px;padding-top:8px;`);
    const org = [companyLine(s), !small && s.location && s.show.location ? s.location : '']
      .filter(Boolean)
      .map(esc)
      .join(' &middot; ');
    if (org)
      rows += tr(
        td(
          org,
          `${f(13, 19, P.muted, false, `font-family:${SERIF};font-style:italic;`)}padding-top:${small ? 1 : 0}px;`,
        ),
      );
    const list = small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location' && c.k !== 'hours');
    const items = list.map((c) => {
      if (A[`ic_${c.k}`] || renderContext.on) return item(c, A, P, { size: 12, gap: 5 });
      const t = c.k === 'phone' || c.k === 'office' ? nb(c.text) : esc(c.text);
      return c.href ? link(c.href, t, /^(mail|web|calendar)$/.test(c.k) ? acc : P.body) : t;
    });
    const so = small ? [] : socialsOf(s);
    const soLine = textLinks(so, acc, P, '|');
    const note = !small && s.hours ? `Replies ${esc(s.hours)}` : '';
    if (!two || small) {
      if (items.length) rows += tr(td(flowLine(items, P, '|'), `${f(12, 18, P.body)}padding-top:6px;`));
      if (soLine) rows += tr(td(soLine, `${f(12, 18, acc)}padding-top:2px;`));
      if (note) rows += tr(td(note, `${f(12, 18, P.muted, false, 'font-style:italic;')}padding-top:6px;`));
      return small ? tbl(rows) : withPhoto(s.show.photo ? photoImg(A, 64, s) : '', tbl(rows), 16);
    }
    const R =
      cgrid(
        items.map((x) => `<span style="${f(12, 18, P.body)}">${x}</span>`),
        { one: true, row: 2 },
      ) +
      (soLine ? `<div style="${f(12, 18, acc)}padding-top:8px;">${soLine}</div>` : '') +
      (note ? `<div style="${f(12, 18, P.muted, false, 'font-style:italic;')}padding-top:6px;">${note}</div>` : '');
    return withPhoto(s.show.photo ? photoImg(A, 64, s) : '', twoCol(tbl(rows), R, P, { gap: 16 }), 16);
  },
});
