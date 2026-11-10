import {
  altRow,
  companyLine,
  contactsOf,
  item,
  photoImg,
  photoSpec,
  replyContacts,
  socials,
  socialsOf,
} from '../content.ts';
import { esc, f, flowLine, img, IMGTD, SERIF, shortText, tbl, td, tr } from '../html.ts';
import { twoCol } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import { iconSpecs } from './shared.ts';
import type { SignatureState, SpecMap } from '../types.ts';

/** The city (the location up to its first comma), or the company. */
function cityOf(s: Pick<SignatureState, 'show' | 'location' | 'company'>): string {
  const l = s.show.location && s.location ? s.location.split(',')[0].trim() : '';
  return l || s.company || '';
}

export const postcardDesign = defineDesign({
  id: 'postcard',
  name: 'Postcard',
  theme: 'ocean',
  anim: 'none',
  cols: 1,
  icons: 'glyph',
  extras: ['quote'],
  cats: ['anyrole', 'creative'],
  badge: 'New',
  tag: 'A postcard with a stamp photo and ruled address lines',
  blurb:
    'Warm and personal: a short message signed with your name, your photo as a perforated postage stamp with a postmark, and your details on ruled address lines. Suits community, education, hospitality, travel and creative roles.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 22, r: 18, maxN: 170 });
    if (s.show.photo && !small) a.photo = photoSpec(s, th, 64, 'stamp', null, 'png', this.anim, o);
    if (!small && cityOf(s))
      a.postmark = {
        kind: 'postmark',
        city: cityOf(s),
        year: String(new Date().getFullYear()),
        size: 54,
        color: o && o.onDark ? th.accentDark : th.accent,
      };
    iconSpecs(
      a,
      s,
      th,
      small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location'),
      !small,
      12,
      'glyph',
    );
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const small = v === 'reply';
    const two = s.colsEff === 2;
    const rule = P.dark ? '#4A4A4A' : '#CFCFCF';
    const items = (small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location')).map((c) =>
      item(c, A, P, { size: 12, gap: 5 }),
    );
    function line(h: string, st?: string) {
      return tr(
        td(
          h,
          `${st || f(13, 19, P.body)}border-bottom:1px solid ${rule};padding:5px 0 4px 0;${shortText(h) ? 'white-space:nowrap;' : ''}`,
        ),
      );
    }
    if (small)
      return tbl(
        nameRow(s, A, D, P, f(15, 20, P.ink, true)) +
          line([s.title, s.company].filter(Boolean).map(esc).join(' &middot; '), f(12, 18, P.body)) +
          (items.length ? line(flowLine(items, P), f(12, 18, P.body)) : ''),
      );
    const msg = s.tagline || s.quote || (cityOf(s) ? `Greetings from ${cityOf(s)}!` : '');
    const M =
      (msg ? tr(td(esc(msg), f(15, 22, P.ink, false, `font-family:${SERIF};font-style:italic;`))) : '') +
      nameRow(s, A, D, P, f(17, 23, acc, true), msg ? 'padding-top:6px;' : '', '', !!A.hname) +
      (A.hname && s.pronouns ? tr(td(`(${esc(s.pronouns)})`, f(12, 16, P.muted))) : '') +
      altRow(s, P, 14, 20);
    const stamp =
      (A.postmark
        ? td(img(A.postmark, 54, 54, ''), `${IMGTD}padding:6px 4px 0 0;vertical-align:top;`, 'valign="top"')
        : '') + (s.show.photo && A.photo ? td(photoImg(A, 64, s), `${IMGTD}vertical-align:top;`, 'valign="top"') : '');
    const top = tbl(
      tr(
        td(tbl(M), 'padding-right:12px;vertical-align:top;', 'valign="top"') +
          (stamp ? td(tbl(tr(stamp)), 'vertical-align:top;', 'valign="top" align="right"') : ''),
      ),
      'width:100%;',
    );
    const who =
      (s.title ? line(esc(s.title), f(13, 19, P.ink, true)) : '') +
      ([s.team, companyLine(s)].filter(Boolean).length
        ? line([s.team, companyLine(s)].filter(Boolean).map(esc).join(' &middot; '), f(12, 18, P.body))
        : '');
    const so = socialsOf(s);
    const soRow = so.length ? socials(so, A, 14, 8, s, P, { noLogo: true }) : '';
    let addr;
    if (two && items.length)
      addr = twoCol(
        tbl(who),
        tbl(items.map((h) => line(h, f(12, 18, P.body))).join('') + (soRow ? tr(td(soRow, 'padding-top:6px;')) : '')),
        P,
        { gap: 14, noHead: true },
      );
    else
      addr = tbl(
        who + items.map((h) => line(h, f(12, 18, P.body))).join('') + (soRow ? tr(td(soRow, 'padding-top:6px;')) : ''),
      );
    const px = s.font !== 'auto' || s.textSize !== 'standard' ? 8 : 16;
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;border:1px solid ${rule};border-radius:6px;border-top:4px solid ${acc};">${tr(td(tbl(tr(td(top)) + tr(td(addr, 'padding-top:10px;'))), `padding:12px ${px}px 12px ${px}px;`))}</table>`;
  },
});
