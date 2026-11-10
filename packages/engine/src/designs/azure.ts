import {
  addLogo,
  altRow,
  companyLine,
  logoInline,
  photoImg,
  photoSpec,
  replyContacts,
  socialsOf,
  taglineRow,
} from '../content.ts';
import { cgrid, esc, f, flowLine, img, lineRows, link, nb, pretty, tbl, td, telOf, tr, url } from '../html.ts';
import { GLYPH, icn } from '../icons.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { handInline, nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import type { SpecMap } from '../types.ts';

export const azureDesign = defineDesign({
  id: 'azure',
  name: 'Azure Essentials',
  theme: 'azure',
  anim: 'sweep',
  cols: 2,
  icons: 'glyph',
  cats: ['azure', 'microsoft'],
  badge: 'New',
  tag: 'Azure portal style Essentials grid',
  blurb:
    'Inspired by the Azure portal: a blue top rule, rounded-square photo and an Essentials grid of your key facts (two columns, or one).',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    nameAsset(a, s, th, v, o, { n: 26, r: 18, fl: true });
    if (v === 'reply') return a;
    if (s.show.photo) a.photo = photoSpec(s, th, 64, 'rounded', { w: 2, gap: 2, stops: th.stops }, 'png', this.anim, o);
    socialsOf(s).forEach((x) => {
      a[`so_${x.k}`] = { kind: 'glyph', icon: GLYPH[x.k], size: 14, color: icn(th) };
    });
    addLogo(a, s, 14);
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    let rows = '';
    if (v === 'reply') {
      const bits = replyContacts(s).map(
        (c) =>
          `<span style="white-space:nowrap;"><span style="color:${P.muted};">${esc(c.label)}</span>&nbsp; ${link(c.href, c.k === 'mail' ? esc(c.text) : nb(c.text), c.k === 'mail' ? acc : P.body)}</span>`,
      );
      const nm = A.hname
        ? tr(
            td(
              handInline(A, D, s, s.title ? esc(s.title) : '', f(13, 19, P.body), 13, 19, 8, '&middot;&nbsp;&nbsp;'),
              'padding-top:6px;',
            ),
          )
        : tr(
            td(
              esc(s.fullName) +
                (s.title ? `<span style="${f(13, 19, P.body)}">&nbsp;&nbsp;&middot; ${esc(s.title)}</span>` : ''),
              `${f(14, 19, P.ink, true)}padding-top:6px;`,
            ),
          );
      if (s.colsEff === 2 && s.cols === 2 && bits.length)
        return tbl(
          tr(
            td(
              twoCol(
                tbl(nm),
                cgrid(
                  bits.map((b) => `<span style="${f(12, 18, P.body)}">${b}</span>`),
                  { one: true, row: 2 },
                ),
                P,
                { gap: 14, rt: 6 },
              ),
            ),
          ),
          `border-top:2px solid ${acc};`,
        );
      rows += nm;
      if (bits.length) rows += tr(td(flowLine(bits, P, '|'), f(12, 18, P.body)));
      return tbl(rows, `border-top:2px solid ${acc};`);
    }
    const head = withPhoto(
      s.show.photo ? photoImg(A, 64, s) : '',
      tbl(
        nameRow(s, A, D, P, f(19, 25, P.ink, true)) +
          altRow(s, P, 14, 20) +
          (s.title ? tr(td(esc(s.title), f(13, 19, P.body))) : '') +
          (companyLine(s) ? tr(td(esc(companyLine(s)), f(12, 18, P.muted))) : ''),
      ),
      14,
      { b: 8, bt: 4 },
    );
    rows += tr(td(head, 'padding-top:12px;'));
    rows += tr(td('Essentials', `${f(12, 18, P.ink, true)}padding:12px 0 4px 0;border-bottom:1px solid ${P.line};`));
    const kv = [];
    if (s.team) kv.push(['Team', esc(s.team)]);
    if (s.region) kv.push(['Region', esc(s.region)]);
    if (s.phone) kv.push(['Mobile', link(telOf(s), nb(s.phone), P.ink)]);
    if (s.office) kv.push(['Office', link(telOf(s, s.office), nb(s.office), P.ink)]);
    if (s.location && s.show.location) kv.push(['Location', esc(s.location)]);
    if (s.email) kv.push(['Email', link(`mailto:${s.email.trim()}`, esc(s.email.trim()), acc)]);
    if (s.website && s.show.website) kv.push(['Website', link(url(s.website), esc(pretty(s.website)), acc)]);
    if (s.hours) kv.push(['Hours', esc(s.hours)]);
    if (s.languages) kv.push(['Languages', esc(s.languages)]);
    if (s.booking && s.show.booking) kv.push(['Book time', link(url(s.booking), 'Open my calendar', acc)]);
    const pairs = kv.map((p) =>
      tbl(
        tr(
          td(
            p[0],
            `${f(12, 18, P.muted)}width:68px;padding:0 10px 0 0;white-space:nowrap;vertical-align:top;`,
            'width="68" valign="top"',
          ) + td(p[1], `${f(12, 18, P.ink)}vertical-align:top;`, 'valign="top"'),
        ),
      ),
    );
    if (pairs.length)
      rows += tr(
        td(
          cgrid(pairs, { one: s.colsEff === 1 || s.show.stack, min: 250, gap: 18, row: 5, max: 560 }),
          'padding-top:5px;',
        ),
      );
    const links = socialsOf(s).map(
      (x) =>
        (A[`so_${x.k}`] ? img(A[`so_${x.k}`], 14, 14, '', { inline: true, css: 'margin:0 5px 2px 0;' }) : '') +
        link(x.href, nb(x.label), acc),
    );
    if (s.show.logo && A.logo) links.push(logoInline(A, s, 14, P, 12));
    if (links.length) rows += lineRows(links, P, '', 520, f(12, 18, acc), 'padding-top:8px;');
    rows += taglineRow(s, P);
    return tbl(rows, `border-top:3px solid ${acc};`);
  },
});
