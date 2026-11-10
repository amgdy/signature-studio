import { deep, tint } from '../color.ts';
import { altRow, contactsOf, initialsOf, psz, replyContacts, socials, socialsOf, taglineRow } from '../content.ts';
import { cgrid, esc, f, flowLine, img, tbl, td, tr } from '../html.ts';
import { wantIcons } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import { iconSpecs, lineItem, textLinks } from './shared.ts';
import type { SpecMap } from '../types.ts';

export const monogramDesign = defineDesign({
  id: 'monogram',
  name: 'Monogram Card',
  theme: 'teal',
  anim: 'none',
  cols: 1,
  icons: 'labels',
  cats: ['anyrole', 'creative'],
  badge: 'New',
  tag: 'Initials badge and a tinted contact card',
  blurb:
    'No photo needed: a bold initials badge, your name and role, then your contacts on a soft tinted card with one-letter labels. Suits any role, and anyone who prefers not to share a photo.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 22, r: 18, maxN: 200 });
    if (s.show.photo && initialsOf(s))
      a.mono = {
        kind: 'monogram',
        text: initialsOf(s),
        size: psz(s, small ? 36 : 60),
        stops: th.stops.map(deep),
        shape: 'rounded',
      };
    if (wantIcons(s)) iconSpecs(a, s, th, small ? replyContacts(s) : contactsOf(s), !small, 12, 'glyph');
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const small = v === 'reply';
    const two = s.colsEff === 2;
    let rows = '';
    const size = psz(s, small ? 36 : 60);
    const badge = A.mono ? img(A.mono, size, size, '') : '';
    rows += nameRow(s, A, D, P, f(small ? 15 : 19, small ? 20 : 25, P.ink, true));
    const role = [s.title, s.company].filter(Boolean).map(esc).join(' &middot; ');
    if (role) rows += tr(td(role, f(small ? 12 : 13, small ? 18 : 19, acc, true)));
    const list = small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location');
    const items = list.map((c) => lineItem(c, A, P, acc));
    if (small) {
      if (two && items.length)
        return withPhoto(badge, twoCol(tbl(rows), cgrid(items, { one: true, row: 2 }), P, { gap: 14 }), 10);
      if (items.length) rows += tr(td(flowLine(items, P), `${f(12, 18, P.body)}padding-top:3px;`));
      return withPhoto(badge, tbl(rows), 10);
    }
    rows += altRow(s, P, 14, 20);
    const pitch = [s.team, s.location && s.show.location ? s.location : ''].filter(Boolean).map(esc).join(' &middot; ');
    if (pitch) rows += tr(td(pitch, f(12, 18, P.muted)));
    rows += taglineRow(s, P, 'padding-top:4px;');
    const so = socialsOf(s);

    const links = so.length
      ? A[`so_${so[0].k}`]
        ? socials(so, A, 14, 8, s, P, { noLogo: true })
        : textLinks(so, acc, P)
      : '';

    let card = '';
    const bg = tint(th, P);
    if (items.length || links) {
      const inner =
        (items.length ? cgrid(items, { one: true, row: 2 }) : '') +
        (links ? `<div style="${f(12, 18, acc)}padding-top:${items.length ? 8 : 0}px;">${links}</div>` : '');
      card = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr>${td(inner, `background-color:${bg};padding:10px 14px;border-radius:10px;`, `bgcolor="${bg}"`)}</tr></table>`;
    }
    const body =
      two && card
        ? twoCol(tbl(rows), card, P, { gap: 14, rw: 220, rule: bg })
        : tbl(rows + (card ? tr(td(card, 'padding-top:10px;')) : ''));
    return withPhoto(badge, body, 16);
  },
});
