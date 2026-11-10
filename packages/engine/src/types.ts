import type {
  DesignCategory,
  EmailProfile,
  ExtraKind,
  FontChoice,
  IconColor,
  IconFamily,
  IconStyle,
  IconWeight,
  PaletteGroup,
  PhotoAnim,
  PhotoLook,
  PhotoShape,
  PhotoSize,
  ReplyStyle,
  TextSize,
} from './options.ts';

export type {
  DesignCategory,
  EmailProfile,
  ExtraKind,
  FontChoice,
  IconColor,
  IconFamily,
  IconStyle,
  IconWeight,
  PaletteGroup,
  PhotoAnim,
  PhotoLook,
  PhotoShape,
  PhotoSize,
  ReplyStyle,
  TextSize,
};

/** `new` is the signature for new messages; `reply` is the short version for replies and forwards. */
export type Version = 'new' | 'reply';
export type ColumnsSetting = 'auto' | 1 | 2 | 3;
export type NameStyle = 'typed' | 'hand';
export type HandPen = 'fountain' | 'brush' | 'fine';
export type BackgroundMode = 'transparent' | 'solid';
export type PhotoPosition = 'column' | 'name';
export type Motion = 'brief' | 'loop';
/** How images are referenced: embedded data URLs, a web address, or files in a folder beside the HTML. */
export type HostingMode = 'embed' | 'hosted' | 'folder';
export type Placement = 'auto' | 'all';
export type ItemIndex = 1 | 2 | 3;

/** Switches that show or hide a field or a feature. */
export interface ShowFlags {
  photo: boolean;
  logo: boolean;
  animate: boolean;
  location: boolean;
  website: boolean;
  booking: boolean;
  linkedin: boolean;
  github: boolean;
  x: boolean;
  teams: boolean;
  tagline: boolean;
  signoff: boolean;
  stack: boolean;
  focus: boolean;
  featured: boolean;
  featDesc: boolean;
  featTag: boolean;
  activity: boolean;
  handle: boolean;
  flourish: boolean;
  pronouns: boolean;
  altName: boolean;
  title: boolean;
  team: boolean;
  company: boolean;
  region: boolean;
  phone: boolean;
  office: boolean;
  email: boolean;
  hours: boolean;
  languages: boolean;
  youtube: boolean;
  learn: boolean;
  blog: boolean;
  banner: boolean;
  disclaimer: boolean;
  stats: boolean;
  quote: boolean;
  /** Set to false to leave out who said the quote. There is no switch for it in the Studio. */
  quoteBy?: boolean;
}

export interface PhotoSettings {
  /** A PNG, JPEG, GIF or WebP data URL. Empty uses the sample photo. */
  src: string;
  zoom: number;
  dx: number;
  dy: number;
}

export interface LogoSettings {
  /** A square logo mark as a PNG, JPEG, GIF or WebP data URL. Empty means no logo. */
  src: string;
}

export interface HostingSettings {
  mode: HostingMode;
  base: string;
}

type FeaturedFields = {
  [K in `feat${ItemIndex}` | `feat${ItemIndex}desc` | `feat${ItemIndex}url` | `feat${ItemIndex}tag`]: string;
};
type StatFields = { [K in `stat${ItemIndex}` | `stat${ItemIndex}label`]: string };

export interface ColorSettings {
  /** One to four colours. The first is also the source of readable text shades. */
  colors: string[];
  /** Blend the colours in decorations; otherwise use the first colour throughout. */
  gradient: boolean;
}

/** Everything the Studio saves: the look and the person's details. */
export interface SignatureState extends FeaturedFields, StatFields, ColorSettings {
  emailProfile: EmailProfile;
  template: string;
  photoAnim: PhotoAnim;
  nameStyle: NameStyle;
  font: FontChoice;
  textSize: TextSize;
  handStyle: string;
  handPen: HandPen;
  bgMode: BackgroundMode;
  /** `tint` or a `#RRGGBB` colour. */
  bgColor: string;
  cols: ColumnsSetting;
  photoPos: PhotoPosition;
  photoSize: PhotoSize;
  replyStyle: ReplyStyle;
  iconStyle: IconStyle;
  iconFamily: IconFamily;
  iconWeight: IconWeight;
  iconColor: IconColor;
  photoShape: PhotoShape;
  photoLook: PhotoLook;
  motion: Motion;

  fullName: string;
  pronouns: string;
  altName: string;
  title: string;
  team: string;
  company: string;
  region: string;
  location: string;
  phone: string;
  office: string;
  email: string;
  website: string;
  booking: string;
  hours: string;
  languages: string;
  linkedin: string;
  github: string;
  x: string;
  youtube: string;
  learn: string;
  blog: string;
  banner: string;
  bannerUrl: string;
  disclaimer: string;
  tagline: string;
  initials: string;
  quote: string;
  focusLabel: string;
  focus: string;
  featLabel: string;
  handle: string;
  quoteBy: string;
  devPrompt: string;
  devGhost: string;
  signoff: string;
  signoffName: string;

  place: Record<ExtraKind, Placement>;
  show: ShowFlags;
  photo: PhotoSettings;
  logo: LogoSettings;
  hosting: HostingSettings;
}

/** A partial state, as read from storage or a signature file. Unknown values are ignored or replaced by defaults. */
export type StateInput = {
  [K in keyof SignatureState]?: SignatureState[K] extends object
    ? Partial<SignatureState[K]> | null
    : SignatureState[K] | null;
} & {
  /** Legacy input only: expanded into colour settings when `colors` is absent. */
  theme?: string;
  customColors?: readonly string[];
};

/** The state as a design sees it: hidden fields are empty, and the layout has been worked out. */
export interface ViewState extends SignatureState {
  /** The email address, even when it is hidden (the Teams link still uses it). */
  linkEmail: string;
  /** Columns the design lays out itself: 1 or 2. */
  colsEff: 1 | 2;
  /** True when link icons move to a third column. */
  cols3: boolean;
  /** Photo scale for the chosen size. */
  pscale: number;
  /** Extra pixels the photo grows by. */
  pgrow: number;
}

/** A named preset for the same colour settings the user edits. */
export interface ThemePreset extends ColorSettings {
  name: string;
  group: PaletteGroup;
}

/** Readable colours resolved from the settings, for any design. */
export interface Theme {
  id: string;
  name: string;
  /** Text and accent colour on light backgrounds (at least 4.6:1 on white). */
  accent: string;
  /** Accent on dark backgrounds (at least 4.6:1 on #1F1F1F). */
  accentDark: string;
  /** Gradient stops. White text or icons on a stop go through `deep()` first. */
  stops: string[];
  /** Where the Studio lists the palette. Your own colours have no group. */
  group?: PaletteGroup;
  /** Icon colour picked to read on a solid background (set by `onSurface()`). */
  icon?: string;
  /** Handwriting colour picked to read on a solid background (set by `onSurface()`). */
  ink?: string;
}

/** Text and line colours for a light or dark page. */
export interface Palette {
  dark: boolean;
  ink: string;
  body: string;
  muted: string;
  faint: string;
  line: string;
  chipBg: string;
  chipBorder: string;
  logoText: string;
  link: string;
}

/** Options passed to `build()`. */
export interface BuildOptions {
  version?: Version;
  /** Build another design than the one in the state. */
  template?: string;
  /** Build in another palette than the one in the state. */
  theme?: string;
  /** Values that override the state for this build only. */
  over?: StateInput;
  /** Render every image without animation. */
  static?: boolean;
}

/** Options a design's `assets()` receives. */
export interface RenderOptions extends BuildOptions {
  /** True when the signature sits on a dark solid background. */
  onDark: boolean;
}

/** `{{img:name}}` tokens by image name; `build()` swaps them for real URLs. */
export type AssetTokens = Record<string, string>;
/** The size an image shows at, in CSS pixels. `base` is the text baseline for handwriting. */
export interface AssetSize {
  w: number;
  h: number;
  base?: number;
}
export type AssetSizes = Record<string, AssetSize>;

/** A rendered image. */
export interface RenderedImage {
  url: string;
  w?: number;
  h?: number;
  base?: number;
}

/** An image in a built signature. */
export interface SignatureImage {
  name: string;
  kind: ImageSpec['kind'];
  /** File name used when images are saved beside the HTML or hosted. */
  file: string;
  dataURL: string;
  mime: string;
  animated: boolean;
}

/** A built signature. */
export interface BuildResult {
  state: SignatureState;
  template: Design;
  theme: Theme;
  version: Version;
  images: Record<string, SignatureImage>;
  /** Plain-text version. */
  text: string;
  /** Solid background colour, or empty when transparent. */
  surface: string;
  /** The background colour Outlook shows in dark mode. */
  darkSurface: string;
  onDark: boolean;
  cols: 1 | 2 | 3;
  replyStyle: ReplyStyle;
  /** The light HTML with images embedded, hosted at `base`, or in a folder named `base`. */
  html(mode?: HostingMode, base?: string): string;
  /** The HTML as Outlook shows it in dark mode, images embedded. */
  darkHtml(): string;
}

/** A design (template). Designs are registered in `designs/index.ts` in gallery order. */
export interface Design {
  id: string;
  name: string;
  /** Default palette. */
  theme: string;
  /** Default photo animation. */
  anim: PhotoAnim;
  /** Columns when the user picks Auto. */
  cols: 1 | 2;
  /** The icon style the design was made with. */
  icons: IconStyle;
  /** Gallery categories. */
  cats: readonly DesignCategory[];
  badge: string;
  tag: string;
  blurb: string;
  /** Extras the design shows in its own way; the rest are added under it. */
  extras?: readonly ExtraKind[];
  /** True when the third column needs a dark panel in dark mode. */
  darkCol3?: boolean;
  /** True when the design always writes the name by hand. */
  handAlways?: boolean;
  /** The images the design needs, keyed by name. */
  assets(this: Design, s: ViewState, th: Theme, v: Version, o: RenderOptions): SpecMap;
  /** The signature HTML. `A` holds image tokens and `D` image sizes, both keyed by image name. */
  html(this: Design, s: ViewState, A: AssetTokens, th: Theme, P: Palette, v: Version, D: AssetSizes): string;
}

/* Image specs say what to draw. renderSpec() turns each one into a PNG, APNG or GIF data URL. */

/** Fields shared by images that can move. */
interface Animatable {
  /** Whether the image plays an animation. */
  animated?: boolean;
  /** How long the animation runs: once, briefly, or in a loop. */
  motion?: Motion;
}

/** Outline of an icon chip. */
export type IconShape = 'circle' | 'rounded' | 'squircle' | 'square';

/** Size of a ring round a photo, in CSS pixels. */
export interface RingSize {
  /** Ring width. */
  w: number;
  /** Space between the ring and the photo. */
  gap: number;
}

/** Ring drawn round a photo: gradient stops or one solid colour. */
export type PhotoRing = RingSize & ({ stops: string[]; color?: undefined } | { stops?: undefined; color: string });

/** A profile photo with its shape, ring, look and animation. */
export interface PhotoSpec extends Animatable {
  kind: 'photo';
  size: number;
  shape: PhotoShape;
  ring: PhotoRing | null;
  /** Output format. JPEG is used for large photos without transparency. */
  fmt: 'png' | 'jpeg';
  anim: PhotoAnim;
  /** Theme gradient stops, used by the layered shape. */
  stops?: string[] | null;
  accent: string;
  look: PhotoLook;
  /** Dark and light colours for the duotone look. */
  duo?: string[] | null;
  motion: Motion;
}

/** A vector glyph icon in one colour, or filled with a gradient. */
export interface GlyphSpec {
  kind: 'glyph';
  icon: string;
  size: number;
  /** One colour, or gradient stops running from top left to bottom right. */
  color: string | string[];
  /** Extra space round the glyph, as a share of the size. */
  inset?: number;
  /** Set when the icon sits on a coloured panel, so restyling keeps its colour. */
  onPanel?: boolean;
}

/** A glyph on a filled or outlined chip. */
export interface ChipSpec {
  kind: 'chip';
  icon: string;
  size: number;
  shape: IconShape;
  /** One colour, or gradient stops. */
  fill?: string | string[];
  fillOpacity?: number;
  fg: string;
  pad?: number;
  stroke?: string;
  strokeW?: number;
  strokeOpacity?: number;
  /** A light sheen over the top half (the Glass style). */
  gloss?: boolean;
  /** A soft shadow under the chip. The chip shrinks a little to make room. */
  shadow?: boolean;
  /** Runs a gradient fill from top to bottom instead of corner to corner. */
  vertical?: boolean;
  /** Set when the icon sits on a coloured panel, so restyling keeps its colour. */
  onPanel?: boolean;
}

/** The person's uploaded logo, fitted into a square. */
export interface LogoSpec {
  kind: 'logo';
  size: number;
  /** A data URL from `state.logo.src`. */
  src: string;
}

/** A row of solid colour blocks. */
export interface StripSpec {
  kind: 'strip';
  w: number;
  h: number;
  colors: string[];
}

/** A vertical or horizontal gradient bar. */
export interface BarSpec {
  kind: 'vbar' | 'hbar';
  w: number;
  h: number;
  stops: string[];
}

/** A soft gradient mesh panel. */
export interface MeshSpec extends Animatable {
  kind: 'mesh';
  w: number;
  h: number;
  stops: string[];
  accent: string;
}

/** A contribution-graph style grid of squares. */
export interface ContribSpec extends Animatable {
  kind: 'contrib';
  cols: number;
  rows: number;
  cell: number;
  gap: number;
}

/** A name set in a script font, used when no handwriting font is loaded. */
export interface ScriptSpec extends Animatable {
  kind: 'script';
  text: string;
  size: number;
  color: string;
}

/** A name written stroke by stroke with a pen. */
export interface HandSpec extends Animatable {
  kind: 'hand';
  text: string;
  size: number;
  color: string;
  style: string;
  pen: HandPen;
  flourish: boolean;
}

/** A rounded button with an optional icon. */
export interface ButtonSpec {
  kind: 'button';
  text: string;
  icon?: string;
  h: number;
  /** One colour or gradient stops. Null leaves the button unfilled. */
  fill: string | string[] | null;
  fg: string;
  /** Outline colour, drawn when there is no fill. */
  outline?: string | null;
}

/** Initials on a gradient tile. */
export interface MonogramSpec {
  kind: 'monogram';
  text: string;
  size: number;
  stops: string[];
  shape?: PhotoShape;
}

/** A large gradient quotation mark. */
export interface QuoteMarkSpec {
  kind: 'quote';
  size: number;
  stops: string[];
}

/** Passport-style machine-readable lines. */
export interface MrzSpec {
  kind: 'mrz';
  lines: string[];
  w: number;
  h: number;
  color: string;
}

/** A round postmark with a city and a year. */
export interface PostmarkSpec {
  kind: 'postmark';
  city: string;
  year: string;
  size: number;
  color: string;
}

/** Three window dots, as on a code editor. */
export interface DotsSpec {
  kind: 'dots';
  w: number;
  h: number;
}

/** A small developer mark: prompt, bullet, tree branch or tick. */
export interface MarkSpec {
  kind: 'mark';
  shape: 'prompt' | 'bullet' | 'tree' | 'tick';
  size: number;
  color: string;
}

/** A blinking text cursor. */
export interface CursorSpec extends Animatable {
  kind: 'cursor';
  w: number;
  h: number;
  color: string;
}

/** A spinner that turns into a tick. */
export interface SpinnerSpec extends Animatable {
  kind: 'spinner';
  size: number;
  color: string;
  /** Colour of the finished tick. */
  ok: string;
}

/** An accent drawn in the theme colours: a gradient line with a passing shine, or a sparkle on a square. */
export interface AccentSpec extends Animatable {
  kind: 'anim';
  which: 'bar' | 'spark';
  /** Gradient stops for the line; the square's colour for the sparkle. */
  colors: string[];
}

/** Any image a design can ask for. */
export type ImageSpec =
  | PhotoSpec
  | GlyphSpec
  | ChipSpec
  | LogoSpec
  | StripSpec
  | BarSpec
  | MeshSpec
  | ContribSpec
  | ScriptSpec
  | HandSpec
  | ButtonSpec
  | MonogramSpec
  | QuoteMarkSpec
  | MrzSpec
  | PostmarkSpec
  | DotsSpec
  | MarkSpec
  | CursorSpec
  | SpinnerSpec
  | AccentSpec;

/** Image specs keyed by image name. */
export type SpecMap = Record<string, ImageSpec>;
