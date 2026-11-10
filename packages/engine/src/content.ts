import { mix, panelOf } from './color.ts';
import { esc, f, img, lineRows, link, nb, pretty, renderContext, tbl, td, teamsUrl, telOf, tr, url } from './html.ts';
import type { ContactKind, IconKind, SocialKind } from './icons.ts';
import type {
  AssetTokens,
  BuildOptions,
  Design,
  ExtraKind,
  ItemIndex,
  Palette,
  PhotoAnim,
  PhotoRing,
  PhotoShape,
  PhotoSpec,
  SignatureState,
  SpecMap,
  Theme,
  Version,
  ViewState,
} from './types.ts';

/** A featured item: a project, repository, talk, publication or product. */
export interface Featured {
  name: string;
  full: string;
  /** Short description, or empty. */
  desc: string;
  /** Tag such as `Open source`, or empty. */
  tag: string;
  /** Full link, or empty. */
  href: string;
  /** True when the link points to GitHub. */
  gh: boolean;
}

/** A highlight: a value (such as `12+`) and its label. */
export type Stat = [value: string, label: string];

const ITEMS: readonly ItemIndex[] = [1, 2, 3];

/** The company and region on one line. */
export function companyLine(s: Pick<SignatureState, 'company' | 'region'>): string {
  return [s.company, s.region].filter(Boolean).join(' ');
}

/** The pronouns in brackets after the name, or empty. */
export function pron(s: Pick<SignatureState, 'pronouns'>, P: Palette): string {
  return s.pronouns ? ` <span style="${f(12, 16, P.muted)}">(${esc(s.pronouns)})</span>` : '';
}

/** The GitHub user name: the handle field, else the name in the GitHub link. */
export function handleOf(s: Pick<SignatureState, 'show' | 'handle' | 'github'>): string {
  if (!s.show?.handle) return '';
  if (s.handle) return s.handle.trim();
  const m = pretty(s.github).match(/github\.com\/([^/?#]+)/i);
  return m ? m[1] : '';
}

/** The small capitals line above the name: the team, else the region. */
export function eyebrowOf(s: Pick<SignatureState, 'team' | 'region'>): string {
  const t = (s.team || s.region || '').replace(/\s*\(([^)]+)\)\s*/, ' \u00b7 $1');
  return t.toUpperCase();
}

/** Up to five focus areas from the comma-separated list. */
export function focusOf(s: Pick<SignatureState, 'show' | 'focus'>): string[] {
  return s.show.focus && s.focus
    ? s.focus
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
}

/** The initials field, else the first letters of the first and last names. */
export function initialsOf(s: Pick<SignatureState, 'initials' | 'fullName'>): string {
  const v = (s.initials || '').trim();
  if (v) return v.slice(0, 3).toUpperCase();
  const w = (s.fullName || '').trim().split(/\s+/).filter(Boolean);
  return w.length ? (w[0].charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase() : '';
}

/* ---------- extras any design can show ---------- */

/** Featured items (projects, repositories, talks, publications, products): a title with an optional description, link and tag. */
export function featuredOf(s: SignatureState): Featured[] {
  if (!s.show.featured) return [];
  const out: Featured[] = [];
  for (const i of ITEMS) {
    const t = (s[`feat${i}`] || '').trim();
    if (!t) continue;
    const u = (s[`feat${i}url`] || '').trim();
    out.push({
      name: t,
      full: t,
      desc: s.show.featDesc ? (s[`feat${i}desc`] || '').trim() : '',
      tag: s.show.featTag ? (s[`feat${i}tag`] || '').trim() : '',
      href: u ? url(u) : '',
      gh: /github\.com\//i.test(u),
    });
  }
  return out;
}

/** The highlights that have a value. */
export function statsOf(s: SignatureState): Stat[] {
  if (!s.show.stats) return [];
  const all: Stat[] = [
    [s.stat1, s.stat1label],
    [s.stat2, s.stat2label],
    [s.stat3, s.stat3label],
  ];
  return all.filter((x) => x[0]);
}

/** Who said the quote, after a dash, or empty. */
function quoteBy(s: Pick<SignatureState, 'show' | 'quoteBy'>, P: Palette): string {
  return s.quoteBy && s.show.quoteBy !== false
    ? `<span style="font-style:normal;color:${P.muted};">&nbsp; &mdash;&nbsp;${esc(s.quoteBy)}</span>`
    : '';
}

/* the name in another script (Arabic, Hebrew...): right-to-left with the right language tag for screen readers */
function langAttrs(v: string): string {
  if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(v)) return 'lang="ar" dir="rtl"';
  if (/[\u0590-\u05FF]/.test(v)) return 'lang="he" dir="rtl"';
  return 'dir="auto"';
}

/** The name in another script, with its language and text direction for screen readers. */
export function altSpan(s: Pick<SignatureState, 'altName'>): string {
  return `<span ${langAttrs(s.altName)}>${esc(s.altName)}</span>`;
}

/** A table row with the name in another script, or empty when there is none. `extra` adds inline CSS. */
export function altRow(
  s: Pick<SignatureState, 'altName'>,
  P: Palette,
  fs?: number,
  lh?: number,
  extra?: string,
  color?: string,
): string {
  return s.altName ? tr(td(altSpan(s), f(fs || 14, lh || 20, color || P.body, true) + (extra || ''))) : '';
}

/** A line with an icon or a label: a contact, or a detail such as the company in the GitHub design. */
export interface ContactItem {
  k: IconKind;
  /** Link target, or empty when the item is not a link. */
  href: string;
  text: string;
  /** Text label, such as `Mobile`, shown when icons are off. */
  label: string;
}

/** A contact: phone, email, website, location and so on. */
export interface Contact extends ContactItem {
  k: ContactKind;
}

/** A profile link, such as LinkedIn or GitHub. */
export interface Social {
  k: SocialKind;
  href: string;
  label: string;
  /** Short text for the link, such as the user name. */
  short: string;
}

/** A call-to-action button. */
export interface Cta {
  k: 'book' | 'teams' | 'linkedin' | 'github';
  label: string;
  /** Icon name in `icons.json`. */
  icon: string;
  href: string;
}

/** The state with the email address kept for the Teams link, even when the email is hidden. */
export type LinkFields = SignatureState & { linkEmail?: string };

/* ---------- what goes in a signature ---------- */

/** The contacts to show, in order. */
export function contactsOf(s: SignatureState): Contact[] {
  const out: Contact[] = [];
  if (s.phone) out.push({ k: 'phone', href: telOf(s), text: s.phone, label: 'Mobile' });
  if (s.office) out.push({ k: 'office', href: telOf(s, s.office), text: s.office, label: 'Office' });
  if (s.email) out.push({ k: 'mail', href: `mailto:${s.email.trim()}`, text: s.email.trim(), label: 'Email' });
  if (s.website && s.show.website)
    out.push({ k: 'web', href: url(s.website), text: pretty(s.website), label: 'Website' });
  if (s.location && s.show.location) out.push({ k: 'location', href: '', text: s.location, label: 'Location' });
  if (s.hours) out.push({ k: 'hours', href: '', text: s.hours, label: 'Hours' });
  if (s.languages) out.push({ k: 'languages', href: '', text: s.languages, label: 'Languages' });
  if (s.booking && s.show.booking)
    out.push({ k: 'calendar', href: url(s.booking), text: 'Book time with me', label: 'Book time' });
  return out;
}

/** The contacts for replies: one phone (mobile, else office) and the email. */
export function replyContacts(s: SignatureState): Contact[] {
  const all = contactsOf(s);

  const ph = all.find((c) => c.k === 'phone') || all.find((c) => c.k === 'office');

  return [ph, all.find((c) => c.k === 'mail')].filter((c) => c !== undefined);
}

/** The profile links to show, in order. */
export function socialsOf(s: LinkFields): Social[] {
  const out: Social[] = [];
  if (s.linkedin && s.show.linkedin)
    out.push({
      k: 'linkedin',
      href: url(s.linkedin),
      label: 'LinkedIn',
      short: pretty(s.linkedin).replace(/^linkedin\.com\//i, ''),
    });
  if (s.github && s.show.github)
    out.push({ k: 'github', href: url(s.github), label: 'GitHub', short: pretty(s.github) });
  if (s.x && s.show.x) out.push({ k: 'x', href: url(s.x), label: 'X', short: pretty(s.x) });
  if (s.youtube) out.push({ k: 'youtube', href: url(s.youtube), label: 'YouTube', short: pretty(s.youtube) });
  if (s.learn)
    out.push({
      k: 'learn',
      href: url(s.learn),
      label: 'Microsoft Learn',
      short: pretty(s.learn).replace(/^learn\.microsoft\.com\//i, ''),
    });
  if (s.blog) out.push({ k: 'blog', href: url(s.blog), label: 'Blog', short: pretty(s.blog) });
  if ((s.linkEmail || s.email) && s.show.teams)
    out.push({ k: 'teams', href: teamsUrl(s), label: 'Chat on Teams', short: 'Chat on Teams' });
  return out;
}

/** Up to two call-to-action buttons: booking, Teams chat, LinkedIn or GitHub. */
export function ctasOf(s: LinkFields): Cta[] {
  const out: Cta[] = [];
  if (s.booking && s.show.booking)
    out.push({ k: 'book', label: 'Book time', icon: 'calendarCheck', href: url(s.booking) });
  if ((s.linkEmail || s.email) && s.show.teams)
    out.push({ k: 'teams', label: 'Chat on Teams', icon: 'teams', href: teamsUrl(s) });
  if (s.linkedin && s.show.linkedin)
    out.push({ k: 'linkedin', label: 'LinkedIn', icon: 'linkedin', href: url(s.linkedin) });
  if (s.github && s.show.github) out.push({ k: 'github', label: 'GitHub', icon: 'github', href: url(s.github) });
  return out.slice(0, 2);
}

/** Options for `item()`. */
export interface ItemOptions {
  /** Icon size in px (14 when left out). */
  size?: number;
  /** Space between the icon and the text in px (6 when left out). */
  gap?: number;
  /** Prefix of the icon's image name (`ic_` when left out). */
  pre?: string;
  /** Font size in px (12 when left out). */
  fs?: number;
  /** Line height in px (18 when left out). */
  lh?: number;
  /** Link colour (the text colour when left out). */
  linkColor?: string;
  /** Text colour (the palette's body colour when left out). */
  color?: string;
  /** Leave out the text label when the icon style is text labels. */
  noLabel?: boolean;
}

/** Options for `socials()`. */
export interface SocialsOptions {
  /** Leave out the logo. */
  noLogo?: boolean;
  /** Colour of text links (the accent when left out). */
  textColor?: string;
  /** Logo size in px (14 when left out). */
  logoSize?: number;
  /** Font size of the company name beside the logo in px (13 when left out). */
  logoFs?: number;
  /** Font size in px (12 when left out). */
  fs?: number;
}

/** One contact: its icon (or a text label) and its value, kept on one line. */
export function item(c: ContactItem, A: AssetTokens, P: Palette, opts?: ItemOptions | null): string {
  let o = opts || {};
  if (renderContext.col3)
    o = {
      ...o,
      fs: Math.min(o.fs || 12, 12),
      lh: Math.min(o.lh || 18, 18),
      size: Math.min(o.size || 14, 14),
      gap: Math.min(o.gap ?? 6, 5),
    };
  const tok = A[`${o.pre || 'ic_'}${c.k}`];
  const col = o.color || P.body;
  const phone = c.k === 'phone' || c.k === 'office';
  const txt = phone ? nb(c.text) : esc(c.text);
  const val = c.href ? link(c.href, txt, o.linkColor || col) : txt;
  /* short items stay on one line; long ones (working hours, an address) may wrap on a narrow screen */
  const short = ((renderContext.on && !tok ? `${c.label}  ` : '') + c.text).length <= 22;
  /* a no-break space glues the icon to its text, so they never split across lines (Outlook drops no-wrap styles) */
  const ic = tok
    ? `${img(tok, o.size || 14, o.size || 14, c.label, {
        inline: true,
        css: `margin:0 ${Math.max(0, (o.gap ?? 6) - 3)}px 0 0;`,
      })}&nbsp;`
    : renderContext.on && c.label && !o.noLabel
      ? /* a long value may move under its label on a narrow screen; it looks the same when it does not */
        `<span style="color:${P.muted};">${esc(c.label)}</span>&nbsp;${short ? '&nbsp;' : ' '}`
      : '';
  return `<span style="${f(o.fs || 12, o.lh || 18, col)}${short ? 'white-space:nowrap;' : ''}">${ic}${val}</span>`;
}

/** Link icons in a row (text links with the Labels style), then the logo. */
export function socials(
  list: readonly Social[],
  A: AssetTokens,
  size: number,
  gap: number,
  s: Pick<SignatureState, 'show' | 'company'>,
  P: Palette,
  opts?: SocialsOptions | null,
): string {
  const o = opts || {};
  let out = '';
  if (list.length) {
    if (!A[`so_${list[0].k}`])
      out = list
        .map((x) => link(x.href, nb(x.label), o.textColor || renderContext.acc))
        .join(`<span style="color:${P.faint};">&nbsp;&nbsp;&middot;&nbsp; </span>`);
    else
      out = list
        .map((x) =>
          link(
            x.href,
            img(A[`so_${x.k}`], size, size, x.label, { inline: true, css: `margin:0 ${gap}px 0 0;` }),
            P.body,
            '',
            x.label,
          ),
        )
        .join('');
  }
  if (s.show.logo && A.logo && !o.noLogo)
    out +=
      (list.length ? `<span style="color:${P.line};">&nbsp;|&nbsp;&nbsp;</span>` : '') +
      logoInline(A, s, o.logoSize || 14, P, o.logoFs || 13);
  return out ? `<span style="${f(o.fs || 12, Math.max(size + 4, 18), P.body)}">${out}</span>` : '';
}

/** Adds the uploaded logo, `size` px square, when it is switched on and there is one. */
export function addLogo(a: SpecMap, s: Pick<SignatureState, 'show' | 'logo'>, size: number): void {
  if (s.show.logo && s.logo.src) a.logo = { kind: 'logo', size, src: s.logo.src };
}

/** Alt text for the logo when the company name does not follow it. */
export function logoAlt(s: Pick<SignatureState, 'company'>): string {
  const name = s.company.trim();
  return name ? `${name} logo` : 'Company logo';
}

/** The logo and the company name. The logo image is decoration when the name follows it. */
export function logoInline(
  A: AssetTokens,
  s: Pick<SignatureState, 'company'>,
  size: number,
  P: Palette,
  fs?: number,
): string {
  const name = s.company.trim();
  const mark = img(A.logo, size, size, name ? '' : logoAlt(s), { inline: true, css: 'margin:0 3px 2px 0;' });
  return `<span style="white-space:nowrap;">${mark}${name ? `&nbsp;<span style="${f(fs || 13, 16, P.logoText, true)}">${esc(name)}</span>` : ''}</span>`;
}

/** A row with the tagline in italics, or nothing when it is hidden. `extra` replaces the default top padding. */
export function taglineRow(s: Pick<SignatureState, 'show' | 'tagline'>, P: Palette, extra?: string): string {
  return s.show.tagline && s.tagline
    ? tr(td(esc(s.tagline), f(12, 18, P.muted, false, 'font-style:italic;') + (extra || 'padding-top:8px;')))
    : '';
}

/** The extras set to "every design", added under any design that is not built around them. */
export function extrasHtml(s: SignatureState, th: Theme, P: Palette, tpl: Pick<Design, 'extras'>, v: Version): string {
  if (v === 'reply' || !s.place) return '';
  const own = tpl.extras || [];
  const acc = P.dark ? th.accentDark : th.accent;
  const groups: string[] = [];
  const want = (k: ExtraKind): boolean => s.place[k] === 'all' && !own.includes(k);
  if (want('focus')) {
    const fo = focusOf(s);
    if (fo.length)
      groups.push(
        tbl(
          tr(
            td(
              `<span style="color:${P.muted};">${esc(s.focusLabel || 'Focus')}</span>&nbsp; ${fo
                .map((x) => `<span style="white-space:nowrap;">${esc(x)}</span>`)
                .join(`<span style="color:${acc};">&nbsp;&nbsp;&bull;&nbsp;</span> `)}`,
              f(12, 18, P.body),
            ),
          ),
        ),
      );
  }
  if (want('stats')) {
    const st = statsOf(s);
    if (st.length)
      groups.push(
        tbl(
          lineRows(
            st.map(
              (x) =>
                `<span style="${f(14, 19, acc, true, 'font-weight:700;')}">${esc(x[0])}</span>${x[1] ? `&nbsp;<span style="${f(12, 19, P.body)}">${esc(x[1])}</span>` : ''}`,
            ),
            P,
            '&middot;',
            440,
            f(12, 19, P.body),
            '',
            12,
          ),
        ),
      );
  }
  if (want('featured')) {
    const fe = featuredOf(s);
    if (fe.length)
      groups.push(
        tbl(
          tr(
            td(
              esc(s.featLabel || 'Featured'),
              f(11, 16, P.muted, true, 'text-transform:uppercase;letter-spacing:0.8px;'),
            ),
          ) +
            fe
              .map((r) => {
                const t = r.href
                  ? link(r.href, esc(r.name), P.link, 'font-weight:600;')
                  : `<span style="font-weight:600;color:${P.ink};">${esc(r.name)}</span>`;
                return tr(
                  td(
                    `<span style="color:${acc};">&rarr;</span>&nbsp; ${t}${r.desc ? `<span style="color:${P.muted};">&nbsp; ${esc(r.desc)}</span>` : ''}${
                      r.tag
                        ? ` <span style="${f(11, 14, P.muted)}padding:0 6px;border:1px solid ${P.chipBorder};border-radius:9px;white-space:nowrap;">${nb(r.tag)}</span>`
                        : ''
                    }`,
                    `${f(12, 18, P.body)}padding-top:3px;`,
                  ),
                );
              })
              .join(''),
        ),
      );
  }
  if (want('quote') && s.quote)
    groups.push(
      tbl(tr(td(`&ldquo;${esc(s.quote)}&rdquo;${quoteBy(s, P)}`, f(13, 19, P.body, false, 'font-style:italic;')))),
    );
  if (!groups.length) return '';
  return tbl(groups.map((g, i) => tr(td(g, i ? 'padding-top:8px;' : ''))).join(''), `border-top:1px solid ${P.line};`);
}

/** The plain-text version of the signature, for email clients that do not show HTML. */
export function plainText(s: SignatureState, v: Version): string {
  const L: string[] = [];
  if (s.show.signoff) {
    if (s.signoff) L.push(s.signoff);
    if (s.signoffName) L.push(s.signoffName);
    L.push('');
  }
  L.push(s.fullName + (s.pronouns ? ` (${s.pronouns})` : ''));
  if (s.altName && v !== 'reply') L.push(s.altName);
  if (v === 'reply') {
    L.push([s.title, companyLine(s)].filter(Boolean).join(' | '));
    const rc = replyContacts(s).map((c) => (c.k === 'phone' ? 'M: ' : c.k === 'office' ? 'O: ' : '') + c.text);
    L.push(rc.join(' | '));
    if (s.disclaimer) L.push('', s.disclaimer);
    return L.filter((x, i) => x || i < 3 || s.disclaimer).join('\n');
  }
  if (s.title) L.push(s.title);
  const org = [s.team, companyLine(s)].filter(Boolean).join(' | ');
  if (org) L.push(org);
  const c: string[] = [];
  if (s.phone) c.push(`M: ${s.phone}`);
  if (s.office) c.push(`O: ${s.office}`);
  if (s.email) c.push(s.email.trim());
  if (s.website && s.show.website) c.push(pretty(s.website));
  if (c.length) L.push(c.join(' | '));
  if (s.location && s.show.location) L.push(s.location);
  if (s.hours) L.push(`Hours: ${s.hours}`);
  if (s.languages) L.push(`Languages: ${s.languages}`);
  const so = socialsOf(s)
    .filter((x) => x.k !== 'teams')
    .map((x) => `${x.label}: ${pretty(x.href)}`);
  if (so.length) L.push(so.join(' | '));
  if (s.booking && s.show.booking) L.push(`Book time: ${url(s.booking)}`);
  if (s.show.tagline && s.tagline) L.push(s.tagline);
  if (s.banner) L.push(s.banner + (s.bannerUrl ? `: ${url(s.bannerUrl)}` : ''));
  if (s.disclaimer) L.push('', s.disclaimer);
  return L.join('\n');
}

/** Puts the sign-off ("Regards" and a name) above the signature, when it is shown. */
export function withSignoff(
  s: Pick<SignatureState, 'show' | 'signoff' | 'signoffName'>,
  html: string,
  P: Palette,
): string {
  if (!s.show.signoff || !(s.signoff || s.signoffName)) return html;
  let rows = '';
  if (s.signoff) rows += tr(td(esc(s.signoff), f(14, 20, P.body)));
  if (s.signoffName) rows += tr(td(esc(s.signoffName), `${f(15, 21, P.ink, true)}padding-top:2px;`));
  return tbl(rows + tr(td(html, 'padding-top:14px;')));
}

/** A call-to-action banner under the new-message signature: white text on a theme colour dark enough to read it. */
export function bannerHtml(s: Pick<SignatureState, 'banner' | 'bannerUrl'>, th: Theme, v: Version): string {
  if (v === 'reply' || !s.banner) return '';
  const bg = panelOf(th);
  const txt = esc(s.banner) + (s.bannerUrl ? '&nbsp;&nbsp;&rarr;' : '');
  const inner = s.bannerUrl ? link(url(s.bannerUrl), txt, '#FFFFFF', 'font-weight:600;') : txt;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr><td bgcolor="${bg}" style="${f(13, 18, '#FFFFFF', true)}background-color:${bg};padding:8px 14px;border-radius:8px;">${inner}</td></tr></table>`;
}

/** A legal or confidentiality notice in small print (kept at 11 px so it stays readable). */
export function disclaimerHtml(s: Pick<SignatureState, 'disclaimer'>, P: Palette): string {
  if (!s.disclaimer) return '';
  return tbl(
    tr(td(esc(s.disclaimer).replace(/\r?\n/g, '<br>'), `${f(11, 16, P.muted)}padding-top:14px;`)),
    'max-width:600px;',
  );
}

/** The photo scale and growth that `build()` works out. Previews leave them out. */
export type PhotoScale = Partial<Pick<ViewState, 'pscale' | 'pgrow'>>;
/** Options that turn animation off. */
export type AnimOptions = Pick<BuildOptions, 'static'>;

/** A photo size scaled by the chosen photo size (S, M, L, XL). */
export function psz(s: PhotoScale, n: number): number {
  return Math.round(n * (s.pscale || 1));
}

/** The photo image at `size` (before scaling), with alt text. */
export function photoImg(A: AssetTokens, size: number, s: Pick<SignatureState, 'fullName'> & PhotoScale): string {
  const px = psz(s, size);
  return img(A.photo, px, px, s.fullName ? `Photo of ${s.fullName}` : 'Profile photo');
}

/** True when images may move: animation is on and the build is not static. */
export function animOn(s: Pick<SignatureState, 'show'>, o?: AnimOptions | null): boolean {
  return s.show.animate && !o?.static;
}

/**
 * The photo spec: each design's shape and ring, unless a shape, look or animation is chosen for every design.
 * `animDefault` is the design's own animation; `forceStatic` keeps the photo still (small reply photos).
 */
export function photoSpec(
  s: SignatureState & PhotoScale,
  th: Theme,
  size: number,
  shape: PhotoShape,
  ring: PhotoRing | null,
  fmt: PhotoSpec['fmt'],
  animDefault: PhotoAnim,
  o?: AnimOptions | null,
  forceStatic?: boolean,
): PhotoSpec {
  if (s.photoShape && s.photoShape !== 'auto') shape = s.photoShape;
  size = psz(s, size);
  let anim: PhotoAnim =
    forceStatic || !animOn(s, o) ? 'none' : s.photoAnim && s.photoAnim !== 'auto' ? s.photoAnim : animDefault || 'none';
  if ((shape === 'polaroid' || shape === 'layers' || shape === 'stamp') && anim !== 'none') anim = 'shine';
  if (anim !== 'none' && anim !== 'shine')
    ring = {
      w: Math.max(2, ring ? ring.w : 2),
      gap: ring?.gap != null ? Math.max(ring.gap, 2) : 2,
      stops: ring?.stops || th.stops,
    };
  const look = s.photoLook || 'natural';
  if (anim !== 'none' || shape !== 'square') fmt = 'png';
  return {
    kind: 'photo',
    size,
    shape,
    ring: shape === 'layers' || shape === 'stamp' ? null : ring || null,
    stops: shape === 'layers' ? th.stops : null,
    fmt,
    anim,
    accent: th.accent,
    look,
    duo:
      look === 'duotone'
        ? [mix(th.stops[0], '#000000', 0.45), mix(th.stops[th.stops.length - 1], '#FFFFFF', 0.82)]
        : null,
    motion: s.motion || 'brief',
  };
}
