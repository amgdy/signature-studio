import { companyLine, photoImg, photoSpec, replyContacts, socialsOf } from './content.ts';
import { esc, f, flowLine, HP0, HP1, img, IMGTD, link, nb, NM, renderContext, spacer, tbl, td, tr } from './html.ts';
import { iconFor, iconOpts } from './icons.ts';
import { handPb, nameAsset } from './name.ts';
import type { AnimOptions, LinkFields, PhotoScale } from './content.ts';
import type { IconOptions } from './icons.ts';
import type { AssetSizes, AssetTokens, Design, Palette, ReplyStyle, SignatureState, SpecMap, Theme } from './types.ts';

/** Options for `withPhoto()`. */
export interface PhotoColumnOptions {
  /** Space above the photo in px. */
  t?: number;
  /** Space above the details in px, when the photo is a plain column. */
  bt?: number;
  /** Width the details keep beside a floating photo in two columns, in px. */
  min?: number;
  /** Width the details keep beside a floating large photo, in px (210 when left out). */
  min1?: number;
  /** Float the photo, so a phone shows the details under it. */
  float?: boolean;
  /** Not used. */
  b?: number;
}

/** Options for `twoCol()`. */
export interface TwoColumnOptions {
  /** Space between the columns in px (18 when left out). */
  gap?: number;
  /** Keep the name in the left column instead of running it across both. */
  noHead?: boolean;
  /** Colour of the rule between the columns. */
  rule?: string;
  /** Width of the contact column in px (180 when left out). */
  rw?: number;
  /** Space above the contact column in px. */
  rt?: number;
  /** Space under the name row in px (10 when left out). */
  hb?: number;
  /** Not used. */
  lw?: number;
}

/** The value of the first `width` attribute in some markup, or 0. */
function widthOf(html: string): number {
  const m = /width="(\d+)"/.exec(html);
  return m ? Number(m[1]) : 0;
}

/* Side by side is built from plain table cells only. Outlook's editor (new Outlook, Outlook on the web and mobile) keeps
   tables exactly but drops floats, inline-blocks and max-widths, so cells are the one layout that looks the same on every
   screen; on narrow screens only the text inside a cell wraps. */

/** The photo beside the details. */
export function withPhoto(photoHtml: string, body: string, gap: number, opts?: PhotoColumnOptions | null): string {
  const o = opts || {};
  const a = body.indexOf(HP0);
  const b = body.indexOf(HP1);
  if (!photoHtml) return a >= 0 ? body.replace(HP0, '').replace(HP1, '') : body;
  /* two columns, photo as a column: the photo floats (Outlook keeps floats on images), so wide screens show it beside both
     columns and narrow screens put it on top, with the name across the columns so they still fit a phone */
  if (
    a >= 0 &&
    b > a &&
    renderContext.photoPos !== 'name' &&
    photoHtml.startsWith('<img ') &&
    photoHtml.indexOf('style="display:block;') > 0
  )
    return tbl(
      tr(
        td(
          photoHtml
            .replace('<img ', '<img align="left" ')
            .replace('style="display:block;', `style="float:left;display:block;margin:${o.t || 0}px ${gap}px 12px 0;`) +
            tbl(
              tr(td(body.replace(HP0, '').replace(HP1, ''))) +
                tr(
                  td(
                    spacer(
                      o.min || (photoHtml.indexOf('width="44"') > 0 || photoHtml.indexOf('width="40"') > 0 ? 290 : 330),
                    ),
                    'font-size:1px;line-height:1px;',
                  ),
                ),
            ),
          'vertical-align:top;',
          'valign="top"',
        ),
      ),
    );
  /* two columns, photo beside the name: the photo sits beside the name across the top, the columns under it keep the full width */
  if (a >= 0 && b > a && renderContext.big && photoHtml.startsWith('<img '))
    return body.slice(0, a) + withPhoto(photoHtml, body.slice(a + 9, b), gap, o) + body.slice(b + 10);
  if (a >= 0 && b > a)
    return (
      body.slice(0, a) +
      tbl(
        tr(
          td(
            photoHtml,
            `width:${widthOf(photoHtml)}px;padding:${o.t || 0}px ${gap}px 0 0;vertical-align:top;`,
            `valign="top" width="${widthOf(photoHtml) + gap}"`,
          ) + td(body.slice(a + 9, b), 'vertical-align:middle;', 'valign="middle"'),
        ),
      ) +
      body.slice(b + 10)
    );
  /* the cell is as wide as the photo (its spacing is padding); the width attribute includes the spacing for Outlook for Windows */
  const pw = widthOf(photoHtml);
  /* a large photo (L or XL) floats, so a phone shows the details under it rather than squeezed beside it */
  if (
    (o.float || renderContext.customTypography || pw >= 110 || (renderContext.big && pw >= 60)) &&
    photoHtml.startsWith('<img ') &&
    photoHtml.indexOf('style="display:block;') > 0
  )
    return tbl(
      tr(
        td(
          photoHtml
            .replace('<img ', '<img align="left" ')
            .replace('style="display:block;', `style="float:left;display:block;margin:${o.t || 0}px ${gap}px 12px 0;`) +
            tbl(tr(td(body)) + tr(td(spacer(o.min1 || 210), 'font-size:1px;line-height:1px;'))),
          'vertical-align:top;',
          'valign="top"',
        ),
      ),
    );
  return tbl(
    tr(
      td(
        photoHtml,
        `width:${pw}px;padding:${o.t || 0}px ${gap}px 0 0;vertical-align:top;`,
        `valign="top" width="${pw + gap}"`,
      ) + td(body, `padding:${o.bt || 0}px 0 0 0;vertical-align:top;`, 'valign="top"'),
    ),
  );
}

/** The top-level rows of a table made by `tbl()`. */
function topRows(html: string): { open: string; rows: string[] } | null {
  const m = /^<table[^>]*>/.exec(html || '');
  if (!m || html.slice(-8) !== '</table>') return null;
  const inner = html.slice(m[0].length, -8);
  const rows: string[] = [];
  let depth = 0;
  let start = -1;
  const re = /<(\/?)(table|tr)\b[^>]*>/g;
  let t: RegExpExecArray | null;
  while ((t = re.exec(inner))) {
    if (t[2] === 'table') {
      depth += t[1] ? -1 : 1;
      continue;
    }
    if (depth) continue;
    if (!t[1]) start = t.index;
    else if (start >= 0) {
      rows.push(inner.slice(start, t.index + t[0].length));
      start = -1;
    }
  }
  return rows.join('') === inner ? { open: m[0], rows } : null;
}

/** Splits off the rows up to and including the name, so the name can run across both columns. */
function splitHead(L: string): [head: string, body: string] {
  const p = topRows(L);
  const nm = renderContext.name ? esc(renderContext.name) : '';
  if (!p || !nm) return ['', L];
  for (let i = 0; i < p.rows.length && i < 3; i++) {
    if (
      p.rows[i].includes(NM) ||
      p.rows[i].includes(`alt="${nm}"`) ||
      p.rows[i].includes(`${nm}<`) ||
      p.rows[i].includes(`${nm} `)
    ) {
      /* the job title right under the name joins it beside the photo */
      const tt = renderContext.title ? esc(renderContext.title) : '';

      let j = i + 1;
      if (
        tt &&
        p.rows[j] &&
        p.rows[j + 1] &&
        p.rows[j].includes(tt) &&
        p.rows[j].replace(/<[^>]+>/g, '').length < 70 &&
        !/<img/.test(p.rows[j])
      )
        j++;
      const rest = p.rows.slice(j).join('');
      return [`${p.open + p.rows.slice(0, j).join('')}</table>`, rest ? `${p.open + rest}</table>` : ''];
    }
  }
  return ['', L];
}

/**
 * Two columns: who you are, then how to reach you after a thin rule. The name runs across both columns, so the
 * columns under it stay narrow enough for a phone. A very long address may break rather than widen the email.
 */
export function twoCol(L: string, R: string, P: Palette, opts?: TwoColumnOptions | null): string {
  const o = opts || {};
  if (!R) return L;
  if (!L) return R;
  let g = o.gap ?? 18;
  if (renderContext.customTypography) g = Math.min(g, 4);
  const sp = o.noHead ? ['', L] : splitHead(L);
  const head = sp[0];
  const body = sp[1];

  /* the contact column asks for its own width first, so a long line on the left cannot squeeze it */
  const c3 = renderContext.col3 && !renderContext.col3used ? renderContext.col3 : '';

  const g3 = Math.min(g, 12);
  /* three columns share a phone's width: tighter gaps and a narrower contact column */
  if (c3) {
    renderContext.col3used = true;
    g = g3;
  }
  const rw = c3 ? Math.min(o.rw || 180, 150) : o.rw || 180;

  const right = td(
    R,
    `width:${rw}px;padding:${o.rt || 0}px ${c3 ? g3 : 0}px 0 ${g}px;vertical-align:top;border-left:1px solid ${o.rule || P.line};word-break:break-word;`,
    `valign="top" width="${rw + g + 1 + (c3 ? g3 : 0)}"`,
  );

  const third = c3
    ? td(
        c3,
        `width:20px;padding:${o.rt || 0}px 0 0 ${g3}px;vertical-align:top;border-left:1px solid ${o.rule || P.line};`,
        `valign="top" width="${21 + g3}"`,
      )
    : '';
  const row = body
    ? tr(td(body, `padding:0 ${g}px 0 0;vertical-align:top;`, 'valign="top"') + right + third)
    : tr(td('', 'width:1px;font-size:1px;line-height:1px;') + right + third);
  return tbl(
    (head
      ? tr(
          td(
            HP0 + head + HP1,
            `padding:0 0 ${o.hb ?? 10}px 0;vertical-align:top;`,
            `colspan="${c3 ? 3 : 2}" valign="top"`,
          ),
        )
      : '') + row,
  );
}

/* three columns: the design in two columns with a third, narrow column of link icons (LinkedIn, GitHub, Teams...) */

/** Image specs for the third column's link icons (`c3_` names), in the chosen icon style or the design's own. */
export function col3Specs(
  s: LinkFields,
  th: Theme,
  o: IconOptions | null | undefined,
  tpl: Pick<Design, 'icons' | 'darkCol3'>,
): SpecMap {
  const st =
    s.iconStyle && s.iconStyle !== 'auto' && s.iconStyle !== 'labels'
      ? s.iconStyle
      : tpl.icons && tpl.icons !== 'labels'
        ? tpl.icons
        : 'glyph';

  const a: SpecMap = {};
  const od = iconOpts(s, tpl.darkCol3 ? { onDark: true } : o);
  socialsOf(s).forEach((x) => {
    const sp = iconFor(st, x.k, 20, th, od, true, false);
    if (sp) a[`c3_${x.k}`] = sp;
  });
  return a;
}

/** The third column: one linked icon per row. */
export function col3Html(s: LinkFields, A: AssetTokens): string {
  const so = socialsOf(s).filter((x) => A[`c3_${x.k}`]);
  if (!so.length) return '';
  return tbl(
    so
      .map((x, i) =>
        tr(
          td(
            link(x.href, img(A[`c3_${x.k}`], 20, 20, x.label), '#0F6CBD', '', x.label),
            IMGTD + (i ? 'padding-top:9px;' : ''),
          ),
        ),
      )
      .join(''),
  );
}

/** A copy of the state without link icons, so the design is drawn without them; they move to the third column. */
export function withoutSocials<T extends SignatureState>(s: T): T {
  return {
    ...s,
    show: { ...s.show, linkedin: false, github: false, x: false, teams: false },
    youtube: '',
    learn: '',
    blog: '',
  };
}

/* ---------- reply versions: short enough to sit on one or two lines ---------- */

/** Image specs for the reply versions: the handwritten name and, for the card, a small photo. */
export function replySpecs(
  s: SignatureState & PhotoScale,
  th: Theme,
  o: AnimOptions | null | undefined,
  rs: ReplyStyle,
): SpecMap {
  const a: SpecMap = {};
  /* `n` is only read for a new message; it is here because the config needs it */
  nameAsset(a, s, th, 'reply', o, { n: 17, r: 17, maxR: 150 });
  if (rs === 'card' && s.show.photo)
    a.photo = photoSpec(s, th, 40, 'circle', { w: 2, gap: 2, stops: th.stops }, 'png', 'none', o, true);
  return a;
}

/** The reply version of the signature in the chosen reply style. */
export function replyHtml(
  s: SignatureState & PhotoScale,
  A: AssetTokens,
  th: Theme,
  P: Palette,
  D: AssetSizes,
  rs: ReplyStyle,
): string {
  const acc = P.dark ? th.accentDark : th.accent;
  const title = s.title || '';
  const org = s.company || companyLine(s) || '';
  const orgFull = companyLine(s) || s.company || '';
  const nameH = A.hname
    ? img(A.hname, D.hname.w, D.hname.h, s.fullName, { inline: true, css: 'vertical-align:middle;margin:0 2px 0 0;' })
    : `<span style="${f(14, 20, P.ink, true)}">${esc(s.fullName)}</span>`;
  const cs = replyContacts(s).map((c) => {
    const ph = c.k === 'phone' || c.k === 'office';
    return link(c.href, ph ? nb(c.text) : esc(c.text), acc, '', c.label);
  });
  const line2 = flowLine([orgFull ? esc(orgFull) : '', ...cs], P);
  const two = (): string => {
    const t1 = title ? `<span style="${f(13, 20, acc, true)}">${esc(title)}</span>` : '';
    /* the handwritten name with the title on its baseline (the title wraps under it on a narrow screen) */
    const first = A.hname
      ? tr(
          td(
            tbl(
              tr(
                td(
                  img(A.hname, D.hname.w, D.hname.h, s.fullName),
                  `${IMGTD}vertical-align:bottom;`,
                  'valign="bottom"',
                ) +
                  (t1
                    ? td(
                        t1,
                        `${f(13, 20, acc, true)}padding:0 0 ${handPb(D, 13, 20)}px 8px;vertical-align:bottom;`,
                        'valign="bottom"',
                      )
                    : ''),
              ),
            ),
            IMGTD,
          ),
        )
      : tr(td(flowLine([nameH, t1], P, '|'), f(14, 20, P.ink)));
    return tbl(first + (line2 ? tr(td(line2, `${f(12, 18, P.muted)}padding-top:2px;`)) : ''));
  };
  switch (rs) {
    case 'name':
      return tbl(tr(td(flowLine([nameH, title ? esc(title) : '', org ? esc(org) : ''], P, '|'), f(13, 20, P.body))));
    case 'two':
      return two();
    case 'bar':
      return tbl(
        tr(td(two(), `border-left:3px solid ${acc};padding:1px 0 1px 10px;vertical-align:top;`, 'valign="top"')),
      );
    case 'card':
      return withPhoto(s.show.photo && A.photo ? photoImg(A, 40, s) : '', two(), 10);
    default:
      return tbl(
        tr(td(flowLine([nameH, title ? esc(title) : '', org ? esc(org) : '', ...cs], P, '|'), f(13, 20, P.body))),
      );
  }
}
