import { deep } from '../color.ts';
import { altSpan, animOn, companyLine, contactsOf, photoImg, photoSpec, replyContacts, socialsOf } from '../content.ts';
import { esc, f, flowLine, img, IMGTD, link, nb, renderContext, tbl, td, tr } from '../html.ts';
import { withPhoto } from '../layout.ts';
import { nameAsset } from '../name.ts';
import { defineDesign } from './kit.ts';
import { devId, DEVKEY, devWin, mono } from './dev.ts';
import type { SpecMap } from '../types.ts';

/** Colours of the code editor window (VS Code dark). */
const CODE = {
  bg: '#1F1F1F',
  tabs: '#181818',
  line: '#2B2B2B',
  text: '#CCCCCC',
  gutter: '#8B949E',
  kw: '#569CD6',
  str: '#CE9178',
  prop: '#9CDCFE',
  punct: '#D4D4D4',
  ghost: '#8B949E',
  fn: '#DCDCAA',
};

/* code in one colour */
function sp(t: string, c: string, extra?: string): string {
  return `<span style="color:${c};${extra || ''}">${t}</span>`;
}

/* a quoted string, linked when it has an address */
function str(t: string, href?: string): string {
  const q = sp('&quot;', CODE.str);
  return q + (href ? link(href, t, CODE.str, 'text-decoration:underline;') : sp(t, CODE.str)) + q;
}

export const editorDesign = defineDesign({
  id: 'editor',
  name: 'Code Editor',
  theme: 'msblue',
  anim: 'none',
  cols: 1,
  icons: 'glyph',
  cats: ['developer', 'microsoft'],
  badge: 'New',
  darkCol3: true,
  tag: 'Your details as code, with a Copilot suggestion',
  blurb:
    'Your signature as a TypeScript file in a dark editor: line numbers, syntax colours, a status bar and a grey Copilot suggestion at the end. In two columns your photo opens in a preview pane; in three, your links sit in the activity bar.',
  assets(s, th, v, o) {
    const a: SpecMap = {};
    const small = v === 'reply';
    nameAsset(a, s, th, v, o, { n: 24, r: 16, maxN: 220, maxR: 150 });
    if (small) return a;
    a.caret = { kind: 'cursor', w: 2, h: 16, color: '#AEAFAD', animated: animOn(s, o), motion: s.motion };
    a.spark = { kind: 'glyph', icon: 'sparkle', size: 12, color: CODE.ghost };
    a.branch = { kind: 'glyph', icon: 'octRepo', size: 12, color: '#FFFFFF' };
    a.sparkW = { kind: 'glyph', icon: 'sparkle', size: 12, color: '#FFFFFF' };
    if (s.show.photo)
      a.photo =
        s.colsEff === 2
          ? photoSpec(s, th, 64, 'rounded', null, 'png', this.anim, o)
          : photoSpec(s, th, 64, 'circle', { w: 2, gap: 2, stops: th.stops }, 'png', this.anim, o);
    return a;
  },
  html(s, A, th, P, v, D) {
    const acc = P.dark ? th.accentDark : th.accent;
    const small = v === 'reply';
    const two = s.colsEff === 2;
    const id = devId(s);
    if (small) {
      return tbl(
        tr(
          td(
            `${
              A.hname
                ? img(A.hname, D.hname.w, D.hname.h, s.fullName, {
                    inline: true,
                    css: 'vertical-align:middle;margin-right:6px;',
                  })
                : `<span style="${f(14, 20, P.ink, true)}">${esc(s.fullName)}</span>&nbsp; `
            }<span style="${mono(12, 18, P.muted)}">// ${esc(s.title || '')}</span>`,
            'padding-bottom:2px;',
          ),
        ) +
          tr(
            td(
              flowLine(
                replyContacts(s).map((c) =>
                  link(c.href, c.k === 'phone' || c.k === 'office' ? nb(c.text) : esc(c.text), acc),
                ),
                P,
              ),
              mono(12, 18, P.body),
            ),
          ),
      );
    }
    /* the code: who you are, then how to reach you, then a grey Copilot suggestion */
    const lines = [
      `${sp('export', CODE.kw)} ${sp('const', CODE.kw)} ${sp(esc(id), CODE.prop)}${sp(' = {', CODE.punct)}`,
    ];
    function prop(k: string, h: string) {
      lines.push(`&nbsp;&nbsp;${sp(k, CODE.prop)}${sp(': ', CODE.punct)}${h}${sp(',', CODE.punct)}`);
    }
    prop('name', str(esc(s.fullName)));
    if (s.altName) prop('aka', str(altSpan(s)));
    if (s.title) prop('role', str(esc(s.title)));
    if (s.team) prop('team', str(esc(s.team)));
    if (companyLine(s)) prop('org', str(esc(companyLine(s))));
    contactsOf(s).forEach((c) => {
      prop(DEVKEY[c.k] || c.k, str(c.k === 'phone' || c.k === 'office' ? nb(c.text) : esc(c.text), c.href));
    });
    const so = socialsOf(s);
    if (so.length)
      prop(
        'links',
        sp('[', CODE.punct) +
          so
            .map((x) => str(x.k === 'teams' ? 'teams' : esc(x.label.toLowerCase()), x.href))
            .join(sp(', ', CODE.punct)) +
          sp(']', CODE.punct),
      );
    lines.push(sp('};', CODE.punct));
    const ghost = `${
      sp(`// ${esc(s.devGhost || 'let\u2019s build something great together')}`, CODE.ghost, 'font-style:italic;') +
      (A.caret ? img(A.caret, 2, 16, '', { inline: true, css: 'margin:0 4px 0 2px;' }) : '') +
      (A.spark ? img(A.spark, 12, 12, '', { inline: true, css: 'margin:0 4px 2px 4px;' }) : '')
    }<span style="${mono(11, 14, CODE.ghost)}border:1px solid #3C3C3C;border-radius:3px;padding:0 4px;white-space:nowrap;">Tab</span>`;
    lines.push(ghost);
    /* three columns share a phone's width, so the panes sit a little closer there */
    const tight = s.cols3;
    const largePhoto = two && !!A.photo && (s.pscale > 1.2 || renderContext.customTypography);
    const gutter = largePhoto ? 4 : tight ? 6 : 10;
    const code = tbl(
      lines
        .map((h, i) =>
          tr(
            td(
              String(i + 1),
              `${mono(12, 18, CODE.gutter)}width:20px;padding:0 ${gutter}px 0 0;text-align:right;vertical-align:top;white-space:nowrap;`,
              `width="${20 + gutter}" align="right" valign="top"`,
            ) + td(h, `${mono(12, 18, CODE.text)}vertical-align:top;`, 'valign="top"'),
          ),
        )
        .join(''),
    );

    /* tabs, panes (activity bar in three columns, the code, a photo preview in two or three), status bar */
    const file = `${esc(id)}.ts`;

    let tabs = td(
      `<span style="${mono(11, 14, CODE.kw, true)}">TS</span>&nbsp; ${file}`,
      `${mono(12, 16, '#FFFFFF')}background-color:${CODE.bg};border-top:2px solid ${th.accentDark};padding:6px 12px 7px 12px;white-space:nowrap;`,
      `bgcolor="${CODE.bg}"`,
    );

    if (two && A.photo) tabs += td('me.jpg', `${mono(12, 16, '#9D9D9D')}padding:8px 12px 7px 12px;white-space:nowrap;`);
    tabs += td('&nbsp;', 'width:100%;font-size:1px;line-height:1px;', 'width="100%"');
    let panes = '';
    const c3 = renderContext.col3 && !renderContext.col3used ? renderContext.col3 : '';
    if (c3) {
      renderContext.col3used = true;
      panes += td(
        c3,
        `background-color:${CODE.tabs};padding:10px ${largePhoto ? 4 : 6}px;vertical-align:top;border-right:1px solid ${CODE.line};width:20px;`,
        `bgcolor="${CODE.tabs}" valign="top" width="${largePhoto ? 28 : 32}"`,
      );
    }
    panes += td(
      code,
      `padding:10px ${largePhoto ? 4 : tight ? 8 : 12}px 10px ${largePhoto ? 0 : tight ? 4 : 6}px;vertical-align:top;`,
      'valign="top"',
    );
    if (two && A.photo)
      panes += td(
        tbl(
          tr(td(photoImg(A, 64, s), IMGTD)) +
            tr(td('me.jpg', `${mono(11, 16, CODE.gutter)}padding-top:4px;text-align:center;`, 'align="center"')),
        ),
        `padding:${largePhoto ? '12px 4px' : tight ? '12px 8px' : '12px'};vertical-align:top;border-left:1px solid ${CODE.line};`,
        'valign="top" align="center"',
      );
    const bg = deep(th.accent);
    /* the status bar's pieces wrap between pieces on a narrow screen */
    const status = `${A.branch ? img(A.branch, 12, 12, '', { inline: true, css: 'margin:0 4px 2px 0;' }) : ''}main&nbsp;&nbsp; &#10003;&nbsp;0&nbsp;problems&nbsp;&nbsp; TypeScript&nbsp;&nbsp; ${A.sparkW ? img(A.sparkW, 12, 12, '', { inline: true, css: 'margin:0 4px 2px 0;' }) : ''}Copilot`;
    const win = devWin(
      tr(
        td(
          tbl(tr(tabs), 'width:100%;'),
          `background-color:${CODE.tabs};border-radius:7px 7px 0 0;`,
          `bgcolor="${CODE.tabs}"`,
        ),
      ) +
        tr(td(tbl(tr(panes), 'width:100%;'))) +
        tr(
          td(
            status,
            `${mono(11, 18, '#FFFFFF')}background-color:${bg};padding:3px 10px;border-radius:0 0 7px 7px;`,
            `bgcolor="${bg}"`,
          ),
        ),
      CODE.bg,
      CODE.line,
      8,
    );
    const out = tbl(
      (A.hname ? tr(td(img(A.hname, D.hname.w, D.hname.h, s.fullName), `${IMGTD}padding-bottom:8px;`)) : '') +
        tr(td(win)),
    );
    /* one column: the photo floats, so a phone shows the editor full width under it */
    return two
      ? out
      : withPhoto(s.show.photo && A.photo ? photoImg(A, 64, s) : '', out, 16, { float: true, min1: 290 });
  },
});
