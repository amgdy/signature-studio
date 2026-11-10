import { contrast, darkModeOf, darkSurface, LIGHT, resolveTheme, tintOf } from './color.ts';
import { HW } from './data.ts';
import { textOf } from './html.ts';
import { canHand } from './name.ts';
import { OPT } from './raster/canvas.ts';
import type { ColorSettings } from './types.ts';

export { build, previewHand, previewIcon, previewPhoto, weight } from './build.ts';
export {
  BG_PRESETS,
  CARD_COLORS,
  MAX_COLORS,
  colorsOfPixels,
  matchingTheme,
  paletteFrom,
  resolveTheme,
  themeSettings,
} from './color.ts';
export { logoColors } from './raster/render.ts';
export { THEMES } from './data.ts';
export { TEMPLATES } from './designs/index.ts';
export { copyRich, copyText, download, downloadHtml, imagesPackage, outlookPackage } from './export.ts';
export { HW_PENS } from './name.ts';
export {
  ANIM_OPTIONS,
  DESIGN_CATEGORY_OPTIONS,
  EMAIL_PROFILE_OPTIONS,
  EXTRA_OPTIONS,
  FONT_OPTIONS,
  ICON_COLOR_OPTIONS,
  ICON_FAMILY_OPTIONS,
  ICON_STYLE_OPTIONS,
  ICON_WEIGHT_OPTIONS,
  LOOK_OPTIONS,
  PALETTE_GROUP_OPTIONS,
  PHOTO_SIZE_OPTIONS,
  REPLY_STYLE_OPTIONS,
  SHAPE_OPTIONS,
  STYLE_KEYS,
  STYLE_SHOW,
  TEXT_SIZE_OPTIONS,
} from './options.ts';
export { DEFAULT_STATE, normalize } from './state.ts';
export type * from './types.ts';
export type { IconPreviewOptions, Weight } from './build.ts';
export type { CopyMethod, ExportPackage, ResultList } from './export.ts';
export type { Option, ShowableField } from './options.ts';

/** A handwriting style the Studio can offer. */
export interface HandStyleInfo {
  id: string;
  label: string;
  /** The font the strokes come from. */
  from: string;
}

/** What a solid background colour means for the signature. */
export interface BgInfo {
  /** True when the colour is dark, so the text turns light. */
  dark: boolean;
  /** Contrast of the better text colour on it (white or the dark ink). */
  contrast: number;
  /** The background Outlook shows in dark mode. */
  darkMode: string;
}

/** Turns image optimisation on or off (smaller files, drawn a little slower). */
export function setOptimize(on: boolean): void {
  // oxlint-disable-next-line typescript/no-unnecessary-type-conversion -- plain JavaScript callers may pass any value
  OPT.on = !!on;
}

/** True when image optimisation is on. */
export function isOptimized(): boolean {
  return OPT.on;
}

/** The handwriting styles, in the order the Studio shows them. */
export function handStyles(): HandStyleInfo[] {
  return HW && HW.order
    ? HW.order.map((id) => {
        const F = HW.fonts[id];
        return { id, label: F.label, from: F.from };
      })
    : [];
}

/** Credit for the handwriting fonts. */
export const handCredit: string = (HW && HW.credit) || '';
export const handLicense: string = HW.license;

/** The soft tint background from the current colour settings. */
export function bgTint(settings: ColorSettings): string {
  return tintOf(resolveTheme(settings));
}

/** Whether a background colour is dark, its best text contrast, and how Outlook shows it in dark mode. */
export function bgInfo(hex: string): BgInfo {
  /* plain JavaScript callers may pass something other than a string */
  const c = textOf(hex);
  return {
    dark: darkSurface(c),
    contrast: Math.max(contrast(c, '#FFFFFF'), contrast(c, LIGHT.ink)),
    darkMode: darkModeOf(c),
  };
}

/** True when the handwriting style (the first one when left out) has every letter of the name. */
export function canHandwrite(name: string, style?: string): boolean {
  return canHand({ fullName: textOf(name), handStyle: style || (HW && HW.order ? HW.order[0] : '') });
}
