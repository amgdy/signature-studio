import {
  altRow,
  animOn,
  companyLine,
  featuredOf,
  handleOf,
  item,
  photoImg,
  photoSpec,
  replyContacts,
  taglineRow,
} from '../content.ts';
import { cgrid, esc, f, flowLine, img, IMGTD, link, nb, pretty, tbl, td, telOf, tr, url } from '../html.ts';
import { OCT } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { handInline, nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import type { ContactItem, Featured } from '../content.ts';
import type { SignatureState, SpecMap } from '../types.ts';

/** Every contact and profile link as a list item, in profile-card order (organisation first). */
function ghMeta(s: SignatureState): ContactItem[] {
  const out: ContactItem[] = [];
  if (companyLine(s)) out.push({ k: 'org', text: companyLine(s), href: '', label: 'Organisation' });
  if (s.location && s.show.location) out.push({ k: 'location', text: s.location, href: '', label: 'Location' });
  if (s.email) out.push({ k: 'mail', text: s.email.trim(), href: `mailto:${s.email.trim()}`, label: 'Email' });
  if (s.phone) out.push({ k: 'phone', text: s.phone, href: telOf(s), label: 'Mobile' });
  if (s.office) out.push({ k: 'office', text: s.office, href: telOf(s, s.office), label: 'Office' });
  if (s.website && s.show.website)
    out.push({ k: 'web', text: pretty(s.website), href: url(s.website), label: 'Website' });
  if (s.hours) out.push({ k: 'hours', text: s.hours, href: '', label: 'Hours' });
  if (s.languages) out.push({ k: 'languages', text: s.languages, href: '', label: 'Languages' });
  if (s.linkedin && s.show.linkedin)
    out.push({
      k: 'linkedin',
      text: pretty(s.linkedin).replace(/^linkedin\.com\//i, ''),
      href: url(s.linkedin),
      label: 'LinkedIn',
    });
  if (s.x && s.show.x) out.push({ k: 'x', text: pretty(s.x), href: url(s.x), label: 'X' });
  if (s.youtube) out.push({ k: 'youtube', text: pretty(s.youtube), href: url(s.youtube), label: 'YouTube' });
  if (s.learn) out.push({ k: 'learn', text: 'Microsoft Learn', href: url(s.learn), label: 'Microsoft Learn' });
  if (s.blog) out.push({ k: 'blog', text: pretty(s.blog), href: url(s.blog), label: 'Blog' });
  if (s.booking && s.show.booking)
    out.push({ k: 'calendar', text: 'Book time with me', href: url(s.booking), label: 'Book time' });
  return out;
}

export const githubDesign = defineDesign({
  id: 'github',
  name: 'Profile Cards',
  theme: 'github',
  anim: 'none',
  cols: 1,
  icons: 'outline',
  cats: ['github', 'anyrole', 'developer'],
  badge: 'New',
  extras: ['featured'],
  tag: 'Profile header, featured cards, activity grid',
  blurb:
    'A profile page in miniature: avatar, handle, up to three featured cards (projects, repositories, talks or products) and an optional animated activity grid.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const grey = o && o.onDark ? '#9198A1' : '#59636E';
    nameAsset(a, s, th, v, o, { n: 27, r: 18, fl: true });
    if (v === 'reply') {
      if (s.show.photo)
        a.photo = photoSpec(s, th, 32, 'circle', { w: 1, gap: 0, color: '#D0D7DE' }, 'png', 'none', o, true);
      replyContacts(s).forEach((c) => {
        a[`ic_${c.k}`] = { kind: 'glyph', icon: OCT[c.k], size: 12, color: grey };
      });
      return a;
    }
    if (s.show.photo) a.photo = photoSpec(s, th, 76, 'circle', { w: 1, gap: 0, color: '#D0D7DE' }, 'png', this.anim, o);
    ghMeta(s).forEach((m) => {
      a[`m_${m.k}`] = { kind: 'glyph', icon: OCT[m.k] || 'octLink', size: 14, color: grey };
    });
    featuredOf(s).forEach((r) => {
      a[r.gh ? 'repo' : 'fstar'] = { kind: 'glyph', icon: r.gh ? 'octRepo' : 'octStar', size: 14, color: grey };
    });
    if (s.show.activity)
      a.contrib = { kind: 'contrib', cols: 30, rows: 4, cell: 6, gap: 2, animated: animOn(s, o), motion: s.motion };
    return a;
  },
  html(s, A, _th, P, v, D) {
    let rows = '';
    const h = handleOf(s);
    const bio = [s.title, companyLine(s)].filter(Boolean).join(' at ');
    const two = s.colsEff === 2;
    if (v === 'reply') {
      if (A.hname)
        rows += tr(
          td(
            handInline(
              A,
              D,
              s,
              (h ? esc(h) : '') +
                (bio ? `<span style="${f(12, 19, P.body)}">${h ? '&nbsp;&middot; ' : ''}${esc(bio)}</span>` : ''),
              f(13, 19, P.muted),
              13,
              19,
              6,
            ),
          ),
        );
      else
        rows += tr(
          td(
            esc(s.fullName) +
              (h ? `<span style="${f(13, 19, P.muted)}">&nbsp; ${esc(h)}</span>` : '') +
              (bio ? `<span style="${f(12, 19, P.body)}">&nbsp;&middot; ${esc(bio)}</span>` : ''),
            f(14, 19, P.ink, true),
          ),
        );
      const it = replyContacts(s).map((c) => item(c, A, P, { size: 12, gap: 5 }));
      const rb = two
        ? twoCol(tbl(rows), cgrid(it, { one: true, row: 3 }), P, { gap: 14 })
        : tbl(rows + (it.length ? tr(td(flowLine(it, P), `${f(12, 18, P.body)}padding-top:3px;`)) : ''));
      return withPhoto(s.show.photo ? photoImg(A, 32, s) : '', rb, 10, { b: 6 });
    }
    rows += nameRow(s, A, D, P, f(20, 26, P.ink, true));
    rows += altRow(s, P, 15, 20);
    if (h) rows += tr(td(esc(h), f(15, 20, P.muted)));
    if (bio) rows += tr(td(esc(bio), `${f(13, 19, P.body)}padding-top:6px;`));
    const meta = ghMeta(s).map((m) => item(m, A, P, { pre: 'm_', size: 14, gap: 6 }));
    const rp = featuredOf(s);
    function card(r: Featured) {
      const ic = r.gh ? A.repo : A.fstar;
      const head =
        (ic ? img(ic, 14, 14, '', { inline: true, css: 'margin:0 6px 2px 0;' }) : '') +
        (r.href
          ? link(r.href, esc(r.name), P.link, 'font-weight:600;')
          : `<span style="color:${P.ink};">${esc(r.name)}</span>`) +
        (r.tag
          ? `&nbsp; <span style="${f(11, 14, P.muted)}display:inline-block;padding:0 6px;border:1px solid ${P.chipBorder};border-radius:9px;white-space:nowrap;">${nb(r.tag)}</span>`
          : '');
      const body = `<div style="${f(12.5, 18, P.link, true)}">${head}</div>${r.desc ? `<div style="${f(12, 16, P.muted)}padding-top:4px;">${esc(r.desc)}</div>` : ''}`;
      return tbl(
        tr(td(body, `padding:8px 10px;border:1px solid ${P.chipBorder};vertical-align:top;`, 'valign="top"')),
        'width:100%;',
      );
    }
    function cards(one: boolean) {
      if (one) return tbl(rp.map((r, i) => tr(td(card(r), i ? 'padding-top:6px;' : ''))).join(''));
      return `<div style="font-size:0;line-height:0;">${rp
        .map(
          (r) =>
            `<div style="display:inline-block;vertical-align:top;width:236px;padding:0 8px 8px 0;">${card(r)}</div>`,
        )
        .join('')}</div>`;
    }
    const pinned = rp.length
      ? `<div style="${f(12, 18, P.body, true)}padding:0 0 6px 0;">${esc(s.featLabel || 'Featured')}</div>`
      : '';
    const contrib = A.contrib ? img(A.contrib, 238, 30, '') : '';
    let body;
    if (two) {
      const L =
        rows + (meta.length ? tr(td(cgrid(meta, { one: true, row: 4 }), 'padding-top:8px;')) : '') + taglineRow(s, P);
      const gr = contrib ? tr(td(contrib, `${IMGTD}padding-top:12px;`)) : '';
      body = rp.length ? tbl(tr(td(twoCol(tbl(L), pinned + cards(true), P, { gap: 18, rw: 220 }))) + gr) : tbl(L + gr);
    } else {
      if (meta.length)
        rows += tr(td(cgrid(meta, { one: s.show.stack, min: 190, gap: 16, row: 4 }), 'padding-top:8px;'));
      if (rp.length) rows += tr(td(pinned + cards(s.show.stack), 'padding-top:8px;'));
      if (contrib) rows += tr(td(contrib, `${IMGTD}padding-top:${rp.length ? 4 : 12}px;`));
      rows += taglineRow(s, P);
      body = tbl(rows);
    }
    return withPhoto(s.show.photo ? photoImg(A, 76, s) : '', body, 16);
  },
});
