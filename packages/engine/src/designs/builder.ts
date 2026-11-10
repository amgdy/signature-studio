import { altRow, contactsOf, handleOf, photoImg, photoSpec, pron, replyContacts, socialsOf } from '../content.ts';
import { cgrid, esc, f, img, lineRows, link, MONO, tbl, td, tr } from '../html.ts';
import { OCT } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { handInline, nameAsset } from '../name.ts';
import { defineDesign } from './kit.ts';
import type { SpecMap } from '../types.ts';

export const builderDesign = defineDesign({
  id: 'builder',
  name: 'Builder',
  theme: 'graphite',
  anim: 'none',
  cols: 1,
  icons: 'outline',
  cats: ['github', 'developer'],
  badge: '',
  tag: 'Code-style chips and @handle',
  blurb: 'GitHub-inspired: avatar, @handle, code-style link chips and an optional // tagline.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const grey = o && o.onDark ? '#9198A1' : '#6E7781';
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 24, r: 18 });
    if (s.show.photo && !small)
      a.photo = photoSpec(s, th, 64, 'circle', { w: 1, gap: 0, color: '#D0D7DE' }, 'png', this.anim, o);
    (small ? replyContacts(s) : contactsOf(s)).forEach((c) => {
      a[`ic_${c.k}`] = { kind: 'glyph', icon: OCT[c.k] === 'octLink' ? 'octGlobe' : OCT[c.k], size: 12, color: grey };
    });
    if (!small)
      socialsOf(s).forEach((x) => {
        a[`so_${x.k}`] = { kind: 'glyph', icon: OCT[x.k], size: 12, color: grey };
      });
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    let rows = '';
    const h = handleOf(s);
    const small = v === 'reply';
    const two = s.colsEff === 2;
    /* each chip is a one-cell table inside a flowing block: browsers flow chips several to a line, and Outlook (which drops
       inline-blocks) lists them one per line with their boxes intact; the cell keeps the icon and text together */
    function chip(tok: string, text: string, href: string) {
      const t = href ? link(href, esc(text), P.body) : esc(text);
      return `<div style="display:inline-block;vertical-align:top;margin:0 6px 6px 0;">${tbl(
        tr(
          td(
            (tok ? `${img(tok, 12, 12, '', { inline: true, css: 'margin:0 3px 2px 0;' })}&nbsp;` : '') + t,
            `${text.length <= 22 ? 'white-space:nowrap;' : ''}background-color:${P.chipBg};border:1px solid ${P.chipBorder};padding:3px 8px;font-family:${MONO};font-size:12px;line-height:16px;color:${P.body};mso-line-height-rule:exactly;`,
            `bgcolor="${P.chipBg}"`,
          ),
        ),
      )}</div>`;
    }
    const monoSt = `font-family:${MONO};font-size:12px;line-height:16px;color:${P.muted};mso-line-height-rule:exactly;`;
    if (A.hname)
      rows += tr(
        td(
          handInline(
            A,
            D,
            s,
            (s.pronouns
              ? `<span style="${f(12, 16, P.muted)}">(${esc(s.pronouns)})</span>${h ? '&nbsp;&nbsp;' : ''}`
              : '') + (h ? `@${esc(h)}` : ''),
            monoSt,
            12,
            16,
            8,
          ),
        ),
      );
    else
      rows += tr(
        td(
          esc(s.fullName) + pron(s, P) + (h ? `<span style="${monoSt}">&nbsp;&nbsp;@${esc(h)}</span>` : ''),
          f(small ? 14 : 17, small ? 19 : 24, P.ink, true),
        ),
      );
    if (!small) rows += altRow(s, P, 14, 20);
    const l2 = [s.title, s.company].filter(Boolean).map(esc).join(' &middot; ');
    if (l2) rows += tr(td(l2, f(small ? 12 : 13, small ? 18 : 19, P.body)));
    if (!small) {
      const l3 = [s.team, s.region].filter(Boolean).map(esc).join(' &middot; ');
      if (l3) rows += tr(td(l3, f(12, 18, P.muted)));
      if (s.show.tagline && s.tagline)
        rows += tr(
          td(
            `// ${esc(s.tagline.charAt(0).toLowerCase() + s.tagline.slice(1))}`,
            `font-family:${MONO};font-size:12px;line-height:18px;color:${acc};padding-top:4px;mso-line-height-rule:exactly;`,
          ),
        );
    }
    let chips = (small ? replyContacts(s) : contactsOf(s)).map((c) => chip(A[`ic_${c.k}`], c.text, c.href));
    if (!small)
      chips = chips.concat(
        socialsOf(s).map((x) => chip(A[`so_${x.k}`], x.k === 'teams' ? 'teams/chat' : x.short, x.href)),
      );
    const photo = s.show.photo && !small ? photoImg(A, 64, s) : '';
    if (two && chips.length)
      return withPhoto(photo, twoCol(tbl(rows), cgrid(chips, { one: true, row: 0 }), P, { gap: 16 }), 14);
    if (chips.length)
      rows += lineRows(chips, P, '', 420, 'font-size:0;line-height:0;', `padding-top:${small ? 6 : 10}px;`, 13);
    return withPhoto(photo, tbl(rows), 14);
  },
});
