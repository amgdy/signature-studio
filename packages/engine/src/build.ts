import {
  boxed,
  DARK,
  darkModeOf,
  darkSurface,
  fit,
  LIGHT,
  onSurface,
  resolveTheme,
  surfaceOf,
  surfacePalette,
  themeSettings,
} from './color.ts';
import { bannerHtml, disclaimerHtml, extrasHtml, photoSpec, plainText, socialsOf, withSignoff } from './content.ts';
import { byId } from './designs/index.ts';
import { HP0, HP1, NM, renderContext, tbl, td, textOf, tr, withTypography } from './html.ts';
import { iconFor, restyle } from './icons.ts';
import { col3Html, col3Specs, replyHtml, replySpecs, withoutSocials } from './layout.ts';
import { PHOTO_SIZES, SHOWABLE } from './options.ts';
import { renderSpec } from './raster/render.ts';
import { normalize } from './state.ts';
import type {
  AssetSizes,
  AssetTokens,
  BuildOptions,
  BuildResult,
  ColorSettings,
  HandPen,
  HostingMode,
  IconColor,
  IconFamily,
  IconStyle,
  IconWeight,
  ImageSpec,
  Palette,
  PhotoShape,
  RenderedImage,
  RenderOptions,
  SignatureImage,
  SignatureState,
  StateInput,
  Theme,
  Version,
  ViewState,
} from './types.ts';

type FieldView = SignatureState & { linkEmail: string };

/** Hidden fields are left out of every design. The Teams link still uses the email address. */
function viewOf(s: SignatureState): FieldView {
  const o: FieldView = { ...s, show: { ...s.show }, linkEmail: s.email };
  for (const k of SHOWABLE) {
    if (!o.show[k]) o[k] = '';
  }
  return o;
}

/** How much a built signature weighs. */
export interface Weight {
  /** Bytes of embedded images (0 when hosted). */
  imageBytes: number;
  /** Number of images. */
  images: number;
  /** Number of animated images. */
  animated: number;
  /** Length of the HTML with images hosted or in a folder. */
  htmlBytes: number;
}

/** Swaps the image tokens in the HTML for data URLs (`embed`), hosted URLs under `base` (`hosted`) or files in folder `base` (`folder`). */
function finalize(res: Pick<BuildResult, 'images'>, html: string, mode?: HostingMode, base?: string): string {
  const m = mode || 'embed';
  return html.replace(/\{\{img:([A-Za-z0-9_]+)\}\}/g, (_m, n: string) => {
    const im = res.images[n];
    if (!im) return '';
    if (m === 'hosted') return textOf(base).replace(/\/*$/, '/') + im.file;
    if (m === 'folder') return `${encodeURI(String(base))}/${im.file}`;
    return im.dataURL;
  });
}

/** True when a PNG data URL is an animated PNG. */
function isApng(d: string): boolean {
  try {
    const head = atob(d.slice(d.indexOf(',') + 1, d.indexOf(',') + 1 + 160));
    return head.indexOf('acTL') > 0;
  } catch {
    return false;
  }
}

/** The bytes of a base64 data URL. */
export function dataUrlBytes(d: string): Uint8Array<ArrayBuffer> {
  const b = atob(d.slice(d.indexOf(',') + 1));
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}

/** How much a built signature weighs: image bytes and counts, and the length of its HTML. */
export function weight(res: Pick<BuildResult, 'images' | 'html'>, mode?: HostingMode): Weight {
  let bytes = 0;
  let n = 0;
  let anim = 0;
  for (const im of Object.values(res.images)) {
    n++;
    if (im.animated) anim++;
    if (mode !== 'hosted') bytes += Math.floor(((im.dataURL.length - im.dataURL.indexOf(',') - 1) * 3) / 4);
  }
  return {
    imageBytes: bytes,
    images: n,
    animated: anim,
    htmlBytes: res.html(mode === 'hosted' ? 'hosted' : 'folder', 'x').length,
  };
}

/** The size fields an image spec may have: some have a width and height, others a size. */
type SpecBox = { kind: string; w?: number; h?: number; size?: number };

/** Builds a signature: renders its images, then the light and dark HTML and the plain text. */
export function build(state: StateInput | SignatureState, opts?: BuildOptions): Promise<BuildResult> {
  const op = opts || {};
  const s0 = normalize(op.over ? { ...state, ...op.over } : state);
  const tpl = byId[op.template || s0.template];
  const th = resolveTheme(op.theme ? themeSettings(op.theme) : s0);
  const v: Version = op.version === 'reply' ? 'reply' : 'new';
  const fv = viewOf(s0);
  const colsEff =
    fv.cols === 1 || fv.cols === 2
      ? fv.cols
      : fv.cols === 3
        ? v === 'reply'
          ? 1
          : 2
        : v === 'reply'
          ? 1
          : tpl.cols || 1;
  /* three columns: the design in two columns, its link icons moved to a third column */
  const cols3 = v === 'new' && fv.cols === 3 && socialsOf(fv).length > 0;
  const pscale =
    v === 'reply' || !fv.show.photo || tpl.id === 'minimal'
      ? 1
      : (PHOTO_SIZES[fv.photoSize] || 1) * (fv.photoShape === 'polaroid' ? 1.15 : 1);
  const s: ViewState = { ...fv, colsEff, cols3, pscale, pgrow: Math.max(0, Math.round((pscale - 1) * 96)) };

  /* reply versions: one of the short generic versions, unless the design's own is chosen */
  const gen = v === 'reply' && s.replyStyle !== 'design';

  const sT = s.cols3 ? withoutSocials(s) : s;
  const surf = surfaceOf(s, th);
  const onDark = !!surf && darkSurface(surf);
  const o: RenderOptions = { ...op, onDark };
  const thA = surf ? onSurface(th, surf) : th;
  const surfD = surf ? darkModeOf(surf) : '';
  /* text in the theme colour reads on the card: the light accent on a light card, the dark accent in dark mode */
  const thT: Theme = surf
    ? { ...th, accent: onDark ? th.accent : fit(th.accent, surf, 4.6), accentDark: fit(th.accentDark, surfD, 4.6) }
    : th;
  const specs = gen ? replySpecs(s, thA, o, s.replyStyle) : restyle(tpl.assets(sT, thA, v, o), sT, thA, o);
  if (s.cols3) Object.assign(specs, col3Specs(s, thA, o, tpl));
  const names = Object.keys(specs);
  const images: Record<string, SignatureImage> = {};
  const A: AssetTokens = {};
  const D: AssetSizes = {};
  return Promise.all(names.map((n) => renderSpec(specs[n], s))).then((rs) => {
    names.forEach((n, i) => {
      const d = rs[i].url;
      const mime = d.slice(5, d.indexOf(';'));
      const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
      const sp: ImageSpec = specs[n];
      const box: SpecBox = sp;
      images[n] = {
        name: n,
        kind: sp.kind,
        file: `${tpl.id + (v === 'reply' ? '-reply' : '')}-${n.replace(/_/g, '-')}.${ext}`,
        dataURL: d,
        mime,
        animated: mime === 'image/png' && isApng(d),
      };
      A[n] = `{{img:${n}}}`;
      /* a spec with no size of its own (only some animations) is never measured by a design */
      D[n] = { w: rs[i].w || box.w || box.size || 0, h: rs[i].h || box.h || box.size || 0, base: rs[i].base };
    });
    const PL = surf ? surfacePalette(surf) : LIGHT;
    const PD = onDark ? PL : DARK;
    /* signature (+ banner) on its card, the sign-off above it, the disclaimer under it, tagged as English left-to-right */
    const compose = (P: Palette, card: string, outer: Palette): string => {
      renderContext.on = s.iconStyle === 'labels';
      renderContext.acc = P.dark ? thT.accentDark : thT.accent;
      renderContext.name = s.fullName || '';
      renderContext.title = s.show.title ? s.title || '' : '';
      renderContext.photoPos = s.photoPos;
      renderContext.col3 = s.cols3 ? col3Html(s, A) : '';
      renderContext.col3used = false;
      renderContext.big = (s.pscale || 1) > 1.05;
      renderContext.customTypography = s.font !== 'auto' || s.textSize !== 'standard';
      let core = gen ? replyHtml(s, A, thT, P, D, s.replyStyle) : tpl.html(sT, A, thT, P, v, D);
      const ban = bannerHtml(s, thT, v);
      const colGap = renderContext.customTypography ? 2 : 6;
      /* a design with no two-column layout of its own still gets the third column, beside it */
      if (renderContext.col3 && !renderContext.col3used)
        core = tbl(
          tr(
            td(core, `padding-right:${colGap}px;vertical-align:top;`, 'valign="top"') +
              td(
                renderContext.col3,
                `width:20px;padding-left:${colGap}px;vertical-align:top;border-left:1px solid ${P.line};`,
                `valign="top" width="${21 + colGap}"`,
              ),
          ),
        );
      renderContext.col3 = '';
      renderContext.big = false;
      const ex = gen ? '' : extrasHtml(s, thT, P, tpl, v);
      if (ex) core = tbl(tr(td(core)) + tr(td(ex, 'padding-top:12px;')));
      if (ban) core = tbl(tr(td(core)) + tr(td(ban, 'padding-top:14px;')));
      let out = withSignoff(s, boxed(core, card, v), outer);
      const disc = disclaimerHtml(s, outer);
      if (disc) out = tbl(tr(td(out)) + tr(td(disc)));
      renderContext.on = false;
      renderContext.name = '';
      renderContext.title = '';
      renderContext.customTypography = false;
      out = out.split(HP0).join('').split(HP1).join('').split(NM).join('');
      return withTypography(
        `<div lang="en" dir="ltr" style="-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;text-size-adjust:100%;word-wrap:break-word;overflow-wrap:break-word;">${out}</div>`,
        s,
      );
    };
    const light = compose(PL, surf, LIGHT);
    const dark = compose(PD, surfD, DARK);
    const res: BuildResult = {
      state: s0,
      template: tpl,
      theme: th,
      version: v,
      images,
      text: plainText(s, v),
      surface: surf,
      darkSurface: surfD,
      onDark,
      cols: s.cols3 ? 3 : s.colsEff,
      replyStyle: gen ? s.replyStyle : 'design',
      html: (mode, base) => finalize(res, light, mode, base),
      darkHtml: () => finalize(res, dark, 'embed'),
    };
    return res;
  });
}

/* Small previews for the Studio's pickers. */

/** Options for `previewIcon()`. */
export interface IconPreviewOptions extends Partial<ColorSettings> {
  family?: IconFamily;
  weight?: IconWeight;
  color?: IconColor;
  /** Size in CSS pixels, 16 when left out. */
  size?: number;
  /** Draws the icon for a dark background. */
  dark?: boolean;
}

/** One icon in an icon style, or null when the style draws no icon. The design's own style shows as soft circles. */
export function previewIcon(style: IconStyle, k: string, opts?: IconPreviewOptions): Promise<RenderedImage | null> {
  const p = opts || {};
  const th = resolveTheme({ ...themeSettings('aurora'), ...p });
  const sp = iconFor(
    style === 'auto' ? 'fluent' : style,
    k,
    p.size || 16,
    th,
    { onDark: !!p.dark, weight: p.weight, color: p.color, family: p.family },
    /^(linkedin|github|x|youtube|learn|blog|teams)$/.test(k),
    false,
  );
  return sp ? renderSpec(sp, {}) : Promise.resolve(null);
}

/** The photo from the state in a shape, still (44 px when `size` is left out). */
export function previewPhoto(
  state: StateInput | SignatureState,
  shape: PhotoShape,
  size?: number,
): Promise<RenderedImage> {
  const s = normalize(state);
  const th = resolveTheme(s);
  s.photoShape = shape;
  s.photoAnim = 'none';
  const sp = photoSpec(
    s,
    th,
    size || 44,
    'circle',
    { w: 2, gap: 2, stops: th.stops },
    'png',
    'none',
    { static: true },
    true,
  );
  return renderSpec(sp, s);
}

/** Text written in a handwriting style, still, at 20 px. */
export function previewHand(text: string, style: string, pen?: HandPen, color?: string): Promise<RenderedImage> {
  return renderSpec(
    {
      kind: 'hand',
      text: textOf(text),
      size: 20,
      color: color || '#0F6CBD',
      animated: false,
      style,
      pen: pen || 'brush',
      flourish: false,
    },
    {},
  );
}
