import { altRow, contactsOf, item, photoImg, photoSpec, psz, replyContacts } from '../content.ts';
import { cgrid, esc, f, IMGTD, link, tbl, td, teamsUrl, tr, url } from '../html.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import { iconSpecs } from './shared.ts';
import type { SpecMap } from '../types.ts';

export const ticketDesign = defineDesign({
  id: 'ticket',
  name: 'Boarding Pass',
  theme: 'azure',
  anim: 'none',
  cols: 1,
  icons: 'glyph',
  cats: ['anyrole', 'creative'],
  badge: 'New',
  tag: 'A ticket with a perforated stub',
  blurb:
    'Memorable and practical: your details laid out like a boarding pass, with a dashed tear line and a stub for your photo and one call to action. Suits travel, events, sales, recruiting and consulting.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 22, r: 18, maxN: 180 });
    if (s.show.photo && !small)
      a.photo = photoSpec(s, th, 60, 'circle', { w: 2, gap: 2, stops: th.stops }, 'png', this.anim, o);
    iconSpecs(a, s, th, small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location'), false, 12, 'glyph');
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const small = v === 'reply';
    function lab(t: string): string {
      return `<span style="${f(11, 14, P.muted, true, 'letter-spacing:1.2px;')}">${esc(t.toUpperCase())}</span>`;
    }
    function field(label: string, h: string, size?: number): string {
      return tbl(tr(td(lab(label))) + tr(td(h, f(size || 13, (size || 13) + 6, P.ink, true))));
    }
    let main = tr(
      td(
        esc(`Boarding pass${s.company ? ` \u00b7 ${s.company}` : ''}`.toUpperCase()),
        `${f(11, 15, acc, true, 'letter-spacing:1.4px;')}padding-bottom:6px;`,
      ),
    );
    main += tr(td(lab('Passenger')));
    /* the pronouns go under a handwritten name, so the ticket stays phone-wide beside its stub */
    const pronUnder = !!(A.hname && s.pronouns);
    main +=
      nameRow(s, A, D, P, f(small ? 16 : 19, small ? 21 : 25, P.ink, true), '', '', pronUnder) +
      (pronUnder ? tr(td(`(${esc(s.pronouns)})`, f(12, 16, P.muted))) : '');
    if (!small) main += altRow(s, P, 14, 20);
    if (s.title) main += tr(td(field('Role', esc(s.title)), 'padding-top:6px;'));
    const from = s.location && s.show.location ? s.location : '';
    const zone = s.region || '';
    if (!small && (from || zone))
      main += tr(
        td(
          tbl(
            tr(
              (from ? td(field('From', esc(from), 12), 'padding-right:14px;vertical-align:top;', 'valign="top"') : '') +
                (zone ? td(field('Zone', esc(zone), 12), 'vertical-align:top;', 'valign="top"') : ''),
            ),
          ),
          'padding-top:6px;',
        ),
      );
    const items = (small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location')).map((c) =>
      item(c, A, P, { size: 12, gap: 5 }),
    );
    if (items.length) main += tr(td(cgrid(items, { one: true, row: 2 }), 'padding-top:10px;'));
    const line = P.dark ? '#5A5A5A' : '#C8C8C8';
    let cta = '';
    if (!small) {
      const go =
        s.booking && s.show.booking
          ? { t: 'Book time', h: url(s.booking) }
          : (s.linkEmail || s.email) && s.show.teams
            ? { t: 'Chat on Teams', h: teamsUrl(s) }
            : s.website && s.show.website
              ? { t: 'Website', h: url(s.website) }
              : null;
      if (go) cta = link(go.h, `${esc(go.t)}&nbsp;&rarr;`, acc, 'font-weight:600;');
    }
    let stub = '';
    if (!small && ((A.photo && s.show.photo) || cta)) {
      stub =
        (A.photo && s.show.photo ? tr(td(photoImg(A, 60, s), `${IMGTD}padding-bottom:10px;`, 'align="center"')) : '') +
        tr(td(lab('Board'), 'text-align:center;', 'align="center"')) +
        (cta ? tr(td(cta, `${f(12, 18, acc, true)}text-align:center;`, 'align="center"')) : '');
      const sw = Math.max(96, psz(s, 60));
      stub = td(
        tbl(stub),
        `padding:14px ${s.cols3 && s.pscale > 1 ? 8 : 12}px;border-left:2px dashed ${line};vertical-align:middle;width:${sw}px;`,
        `valign="middle" width="${sw}"`,
      );
    }
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;border:1px solid ${line};border-radius:12px;"><tr>${td(tbl(main), `padding:${small ? '10px 14px' : '14px 16px'};vertical-align:top;`, 'valign="top"')}${stub}</tr></table>`;
  },
});
