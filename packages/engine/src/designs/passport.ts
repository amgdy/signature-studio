import { deep, tint } from '../color.ts';
import {
  altRow,
  companyLine,
  contactsOf,
  item,
  photoImg,
  photoSpec,
  pron,
  replyContacts,
  socials,
  socialsOf,
} from '../content.ts';
import { cgrid, esc, f, flowLine, img, IMGTD, tbl, td, tr } from '../html.ts';
import { twoCol, withPhoto } from '../layout.ts';
import { nameAsset, nameRow } from '../name.ts';
import { defineDesign } from './kit.ts';
import { iconSpecs } from './shared.ts';
import type { Palette, SignatureState, SpecMap } from '../types.ts';

/* text for the passport strip: capitals and digits, with "<" between words */
function mrzClean(t: string | undefined): string {
  return (t || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '<')
    .replace(/^<+|<+$/g, '');
}

/* one passport strip line: 44 characters, filled with "<" */
function mrzPad(x: string): string {
  return x.slice(0, 44).padEnd(44, '<');
}

/** The two lines of a machine-readable strip in passport style. It is decorative, drawn as an image with no alt text. */
function mrzOf(
  s: Pick<SignatureState, 'fullName' | 'company' | 'title' | 'region' | 'location'>,
): [line1: string, line2: string] {
  const w = (s.fullName || '').trim().split(/\s+/).filter(Boolean);

  const sur = mrzClean(w.at(-1));
  const giv = mrzClean(w.slice(0, -1).join(' '));
  return [
    mrzPad(`P<${`${mrzClean(s.company)}XXX`.slice(0, 3)}${sur}<<${giv}`),
    mrzPad(`${mrzClean(s.title)}<<${mrzClean(s.region || s.location || '')}`),
  ];
}

/** A small label in capitals, in the muted colour unless `color` is given. */
function capLabel(t: string, P: Palette, color?: string): string {
  return `<span style="${f(11, 14, color || P.muted, true, 'letter-spacing:1.1px;')}">${esc(t.toUpperCase())}</span>`;
}

export const passportDesign = defineDesign({
  id: 'passport',
  name: 'Passport',
  theme: 'navy',
  anim: 'none',
  cols: 1,
  icons: 'glyph',
  cats: ['anyrole', 'creative'],
  badge: 'New',
  tag: 'A passport data page with a machine-readable strip',
  blurb:
    'Your details as a passport data page: a cover-colour header, labelled fields, your handwritten name as the bearer\u2019s signature and a machine-readable strip. Suits global, travel, consulting and partner-facing roles.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 22, r: 18, maxN: 190 });
    if (s.show.photo && !small) a.photo = photoSpec(s, th, 72, 'rounded', null, 'png', this.anim, o);
    iconSpecs(
      a,
      s,
      th,
      small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location'),
      !small,
      12,
      'glyph',
    );
    if (!small) a.mrz = { kind: 'mrz', lines: mrzOf(s), w: 280, h: 28, color: o && o.onDark ? '#BDBDBD' : '#616161' };
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const small = v === 'reply';
    const two = s.colsEff === 2;
    const cover = deep(th.stops[0]);
    const page = tint(th, P, 0.95);
    function field(label: string, h: string, size?: number) {
      return tbl(tr(td(capLabel(label, P))) + tr(td(h, f(size || 13, (size || 13) + 6, P.ink, true))));
    }

    const w = (s.fullName || '').trim().split(/\s+/).filter(Boolean);

    const sur = w.length > 1 ? w[w.length - 1] : w[0] || '';
    const giv = w.length > 1 ? w.slice(0, -1).join(' ') : '';
    const items = (small ? replyContacts(s) : contactsOf(s).filter((c) => c.k !== 'location')).map((c) =>
      item(c, A, P, { size: 12, gap: 5 }),
    );
    if (small) {
      const r1 =
        tr(td(capLabel('Passport', P, acc))) +
        nameRow(s, A, D, P, f(15, 20, P.ink, true)) +
        (s.title ? tr(td(esc(s.title), f(12, 18, P.body))) : '');
      return tbl(
        tr(
          td(
            tbl(r1 + (items.length ? tr(td(flowLine(items, P), `${f(12, 18, P.body)}padding-top:3px;`)) : '')),
            `border-left:3px solid ${cover};padding-left:10px;`,
          ),
        ),
      );
    }
    /* the name: handwritten as the bearer's signature, or typed as surname and given names */
    let nm = A.hname
      ? tr(td(capLabel('Name / signature', P))) + nameRow(s, A, D, P, '', 'padding-top:2px;')
      : tr(
          td(
            tbl(
              tr(
                td(
                  field('Surname', esc(sur) + pron(s, P), 16),
                  'padding-right:16px;vertical-align:top;',
                  'valign="top"',
                ) + (giv ? td(field('Given names', esc(giv), 16), 'vertical-align:top;', 'valign="top"') : ''),
              ),
            ),
          ),
        );
    nm += altRow(s, P, 14, 20, 'padding-top:2px;');
    let rest = '';
    if (s.title) rest += tr(td(field('Role', esc(s.title)), 'padding-top:8px;'));
    const team = s.team || '';
    const base = s.location && s.show.location ? s.location : '';
    if (two) {
      if (team) rest += tr(td(field('Team', esc(team), 12), 'padding-top:8px;'));
      if (base) rest += tr(td(field('Based in', esc(base), 12), 'padding-top:8px;'));
    } else if (team || base)
      rest += tr(
        td(
          tbl(
            tr(
              (team ? td(field('Team', esc(team), 12), 'padding-right:16px;vertical-align:top;', 'valign="top"') : '') +
                (base ? td(field('Based in', esc(base), 12), 'vertical-align:top;', 'valign="top"') : ''),
            ),
          ),
          'padding-top:8px;',
        ),
      );
    if (companyLine(s)) rest += tr(td(field('Issued by', esc(companyLine(s)), 12), 'padding-top:8px;'));
    const so = socialsOf(s);
    const soRow = so.length ? socials(so, A, 14, 8, s, P, { noLogo: true }) : '';
    const photo = s.show.photo && A.photo ? photoImg(A, 72, s) : '';
    let body;
    if (two && items.length) {
      /* two columns: the photo beside the name across the page, then the fields beside the contacts */
      body = tbl(
        tr(td(withPhoto(photo, tbl(nm), 14))) +
          tr(
            td(
              twoCol(
                tbl(rest),
                cgrid(items, { one: true, row: 4 }) + (soRow ? `<div style="padding-top:8px;">${soRow}</div>` : ''),
                P,
                { gap: 14, noHead: true },
              ),
              'padding-top:4px;',
            ),
          ),
      );
    } else {
      let rows = nm + rest;
      if (items.length) rows += tr(td(cgrid(items, { min: 170, gap: 14, row: 4 }), 'padding-top:10px;'));
      if (soRow) rows += tr(td(soRow, 'padding-top:6px;'));
      body = withPhoto(photo, tbl(rows), 14);
    }
    const px = two ? 10 : 14;

    const head = tbl(
      tr(
        td('PASSPORT', f(12, 16, '#FFFFFF', true, 'letter-spacing:2.4px;')) +
          td(
            esc((s.company || '').toUpperCase()),
            `${f(11, 16, '#FFFFFF', true, 'letter-spacing:1.6px;')}text-align:right;`,
            'align="right"',
          ),
      ),
      'width:100%;',
    );

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;border:1px solid ${P.dark ? '#4A4A4A' : '#C8C8C8'};border-radius:10px;">${tr(
      td(head, `background-color:${cover};padding:8px ${px}px;border-radius:9px 9px 0 0;`, `bgcolor="${cover}"`),
    )}${tr(td(body, `background-color:${page};padding:12px ${px}px 10px ${px}px;`, `bgcolor="${page}"`))}${
      A.mrz
        ? tr(
            td(
              img(A.mrz, 280, 28, ''),
              `${IMGTD}background-color:${page};padding:2px ${px}px 12px ${px}px;border-radius:0 0 9px 9px;`,
              `bgcolor="${page}"`,
            ),
          )
        : ''
    }</table>`;
  },
});
