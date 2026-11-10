import { altRow, contactsOf, photoImg, photoSpec, pron, replyContacts, socials, socialsOf } from '../content.ts';
import { cgrid, esc, f, flowLine, NM, tbl, td, tr } from '../html.ts';
import { wantIcons } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import { iconSpecs, lineItem, textLinks } from './shared.ts';
import type { SpecMap } from '../types.ts';

export const boldDesign = defineDesign({
  id: 'bold',
  name: 'Bold Type',
  theme: 'sunrise',
  anim: 'none',
  cols: 1,
  icons: 'labels',
  cats: ['anyrole', 'creative'],
  badge: 'New',
  tag: 'Big two-line name and one colour block',
  blurb:
    'Typographic and confident: your first name heavy, your last name light in colour, a single colour block and one-letter contact labels. Suits designers, architects, founders and strong personal brands.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 30, r: 19, maxN: 220 });
    if (s.show.photo && !small) a.photo = photoSpec(s, th, 76, 'square', null, 'png', this.anim, o);
    if (wantIcons(s)) iconSpecs(a, s, th, small ? replyContacts(s) : contactsOf(s), !small, 12, 'glyph');
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const small = v === 'reply';
    const two = s.colsEff === 2;
    let rows = '';

    const words = (s.fullName || '').trim().split(/\s+/);

    const first = words.length > 1 ? words.slice(0, -1).join(' ') : words[0] || '';
    const last = words.length > 1 ? words[words.length - 1] : '';
    if (!small)
      rows += tr(
        td(
          tbl(
            tr(
              td(
                '&nbsp;',
                `width:14px;height:14px;font-size:1px;line-height:1px;background-color:${acc};`,
                `width="14" height="14" bgcolor="${acc}"`,
              ),
            ),
          ),
          'padding-bottom:8px;',
        ),
      );
    if (A.hname) rows += nameRow(s, A, D, P, '');
    else if (small)
      rows += tr(
        td(
          `<span style="font-weight:800;">${esc(first)}</span> <span style="font-weight:300;color:${acc};">${esc(last)}</span>${pron(s, P)}`,
          f(16, 21, P.ink, true),
        ),
      );
    else {
      /* the two name lines share one row, marked as the name so two columns can run it across both */
      rows += tr(
        td(
          tbl(
            tr(td(esc(first), f(30, 32, P.ink, true, 'font-weight:800;letter-spacing:-0.6px;'))) +
              (last
                ? tr(td(esc(last) + pron(s, P), f(30, 34, acc, false, 'font-weight:300;letter-spacing:-0.6px;')))
                : ''),
          ) + NM,
        ),
      );
    }
    const role = [s.title, s.company].filter(Boolean).map(esc).join(' &mdash; ');
    if (role)
      rows += tr(td(role, f(small ? 12 : 13, small ? 18 : 19, P.body, true) + (small ? '' : 'padding-top:6px;')));
    if (!small) rows += altRow(s, P, 14, 20);
    const items = (small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location')).map((c) =>
      lineItem(c, A, P, acc),
    );
    const so = small ? [] : socialsOf(s);

    const soLine = so.length
      ? A[`so_${so[0].k}`]
        ? socials(so, A, 14, 8, s, P, { noLogo: true })
        : textLinks(so, acc, P, '/')
      : '';

    let body;
    if (two && items.length)
      body = twoCol(
        tbl(rows),
        cgrid(items, { one: true, row: 2 }) +
          (soLine ? `<div style="${f(12, 18, acc)}padding-top:8px;">${soLine}</div>` : ''),
        P,
        { gap: 16 },
      );
    else {
      if (items.length) rows += tr(td(flowLine(items, P, ''), `${f(12, 18, P.body)}padding-top:${small ? 3 : 10}px;`));
      if (soLine) rows += tr(td(soLine, `${f(12, 18, acc)}padding-top:4px;`));
      body = tbl(rows);
    }
    return small ? body : withPhoto(s.show.photo ? photoImg(A, 76, s) : '', body, 18);
  },
});
