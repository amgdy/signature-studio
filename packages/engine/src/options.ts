import type { ShowFlags, SignatureState } from './types.ts';

/** A choice shown in a picker. */
export interface Option {
  readonly id: string;
  readonly label: string;
  readonly note?: string;
  readonly own?: string;
}

export const EMAIL_PROFILE_OPTIONS = [
  { id: 'outlook', label: 'Outlook', note: 'New Outlook, web, classic Windows, Mac and mobile.' },
] as const;
export type EmailProfile = (typeof EMAIL_PROFILE_OPTIONS)[number]['id'];

export const ICON_FAMILY_OPTIONS = [
  { id: 'standard', label: 'Classic', note: 'The original drawing set.' },
  { id: 'rounded', label: 'Rounded', note: 'Soft curves and rounded details.' },
  { id: 'geometric', label: 'Geometric', note: 'Angular shapes and cut corners.' },
  { id: 'handdrawn', label: 'Hand-drawn', note: 'Loose, gently uneven strokes.' },
] as const;
export type IconFamily = (typeof ICON_FAMILY_OPTIONS)[number]['id'];

export const FONT_OPTIONS = [
  { id: 'auto', label: 'Design default', stack: '' },
  { id: 'arial', label: 'Arial', stack: 'Arial,Helvetica,sans-serif' },
  { id: 'verdana', label: 'Verdana', stack: 'Verdana,Geneva,Arial,sans-serif' },
  { id: 'trebuchet', label: 'Trebuchet', stack: "'Trebuchet MS',Arial,Helvetica,sans-serif" },
  { id: 'georgia', label: 'Georgia', stack: "Georgia,'Times New Roman',Times,serif" },
  { id: 'times', label: 'Times', stack: "'Times New Roman',Times,Georgia,serif" },
  { id: 'courier', label: 'Courier', stack: "'Courier New',Courier,monospace" },
] as const;

export const TEXT_SIZE_OPTIONS = [
  { id: 'standard', label: 'Standard', min: 11 },
  { id: 'comfortable', label: 'Comfortable', min: 12 },
  { id: 'large', label: 'Large', min: 13 },
] as const;

export type FontChoice = (typeof FONT_OPTIONS)[number]['id'];
export type TextSize = (typeof TEXT_SIZE_OPTIONS)[number]['id'];

export const ICON_STYLE_OPTIONS = [
  { id: 'auto', label: 'Template\u2019s own', note: 'Each template keeps the icons it was designed with.' },
  {
    id: 'labels',
    label: 'Text labels',
    note: 'No icons: \u201cMobile\u201d, \u201cEmail\u201d and text links, as in Executive. The most accessible choice.',
  },
  { id: 'glyph', label: 'Glyphs', note: 'Plain icons in your theme colour.' },
  { id: 'outline', label: 'Outline', note: 'Thin grey line icons, as in Profile Cards.' },
  { id: 'gradient', label: 'Gradient', note: 'Plain icons filled with your theme gradient.' },
  {
    id: 'brand',
    label: 'Brand',
    note: 'Links in their own brand colours (LinkedIn blue, GitHub black), contacts in your theme colour.',
  },
  { id: 'ring', label: 'Rings', note: 'Icons in a thin circle.' },
  { id: 'square', label: 'Frames', note: 'Icons in a thin rounded square.' },
  {
    id: 'fluent',
    label: 'Soft circles',
    note: 'Each kind of contact in its own clear colour on a soft round tint, links in their brand colours.',
  },
  { id: 'soft', label: 'Soft squares', note: 'Icons on a soft tinted square.' },
  { id: 'glass', label: 'Glass', note: 'Icons on a clear tinted square with a light edge and a shine.' },
  { id: 'circle', label: 'Circles', note: 'White icons on solid round buttons.' },
  { id: 'tile', label: 'Tiles', note: 'White icons on square tiles, as in Fluent Tiles.' },
  { id: 'rounded', label: 'Rounded', note: 'White icons on rounded gradient squares, as in Foundry Mesh.' },
  { id: 'squircle', label: 'Squircles', note: 'White icons on smooth app-style squares.' },
  { id: 'sticker', label: 'Stickers', note: 'White icons on round stickers with a white edge and a soft shadow.' },
  { id: 'depth', label: 'Depth', note: 'White icons on raised squares, lit from above.' },
] as const satisfies readonly Option[];

/** How heavy the icons are drawn. Every style can take any weight. */
export const ICON_WEIGHT_OPTIONS = [
  { id: 'auto', label: 'Style\u2019s own', note: 'Each style\u2019s usual icons.' },
  { id: 'line', label: 'Line', note: 'Light outlines.' },
  { id: 'bold', label: 'Bold', note: 'Heavier outlines that stay clear when small.' },
  { id: 'solid', label: 'Solid', note: 'Filled shapes.' },
  { id: 'duotone', label: 'Duotone', note: 'Outlines over a soft fill.' },
] as const satisfies readonly Option[];

/** Which colours the icons use. Every style can take any colour mode. */
export const ICON_COLOR_OPTIONS = [
  { id: 'auto', label: 'Style\u2019s own', note: 'Each style\u2019s usual colours.' },
  { id: 'theme', label: 'Theme', note: 'Every icon in your theme colour.' },
  { id: 'colourful', label: 'Colourful', note: 'A clear colour for each kind of contact, links in brand colours.' },
  { id: 'brand', label: 'Brand links', note: 'Links in brand colours, contacts in your theme colour.' },
  { id: 'two', label: 'Two-tone', note: 'Contacts in your theme colour, links in its second colour.' },
  { id: 'neutral', label: 'Grey', note: 'Quiet grey icons that suit any theme.' },
] as const satisfies readonly Option[];

export const SHAPE_OPTIONS = [
  { id: 'auto', label: 'Auto' },
  { id: 'circle', label: 'Circle' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'squircle', label: 'Squircle' },
  { id: 'square', label: 'Square' },
  { id: 'arch', label: 'Arch' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'slice', label: 'Slice' },
  { id: 'slices', label: 'Slices' },
  { id: 'layers', label: 'Layers' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'octagon', label: 'Octagon' },
  { id: 'blob', label: 'Blob' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'stamp', label: 'Stamp' },
] as const satisfies readonly Option[];

export const LOOK_OPTIONS = [
  { id: 'natural', label: 'Natural' },
  { id: 'mono', label: 'Black & white' },
  { id: 'duotone', label: 'Duotone' },
  { id: 'sepia', label: 'Sepia' },
] as const satisfies readonly Option[];

export const ANIM_OPTIONS = [
  { id: 'auto', label: 'Auto' },
  { id: 'none', label: 'Off' },
  { id: 'spin', label: 'Spin' },
  { id: 'sweep', label: 'Sweep' },
  { id: 'orbit', label: 'Orbit' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'comet', label: 'Comet' },
  { id: 'dash', label: 'Dash' },
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'shine', label: 'Shine' },
  { id: 'draw', label: 'Draw' },
] as const satisfies readonly Option[];

export const PHOTO_SIZE_OPTIONS = [
  { id: 'S', label: 'S', note: 'Smaller' },
  { id: 'M', label: 'M', note: 'As designed' },
  { id: 'L', label: 'L', note: '20% larger' },
  { id: 'XL', label: 'XL', note: '40% larger' },
] as const satisfies readonly Option[];

export const REPLY_STYLE_OPTIONS = [
  {
    id: 'line',
    label: 'One line',
    note: 'Name, title, company, mobile and email on one line; it wraps between items on a phone.',
  },
  { id: 'two', label: 'Two lines', note: 'Your name and title, then company and contacts.' },
  { id: 'bar', label: 'Colour bar', note: 'Two lines beside a thin bar in your theme colour.' },
  { id: 'card', label: 'Mini card', note: 'Two lines beside a small photo.' },
  { id: 'name', label: 'Name only', note: 'Name, title and company on one line, no contacts.' },
  { id: 'design', label: 'Design’s own', note: 'The reply version made for each design.' },
] as const satisfies readonly Option[];

/** Palette groups, in the order the Studio shows them. */
export const PALETTE_GROUP_OPTIONS = [
  { id: 'tech', label: 'Microsoft and tech' },
  { id: 'calm', label: 'Classic and calm' },
  { id: 'nature', label: 'Nature' },
  { id: 'warm', label: 'Warm' },
  { id: 'rich', label: 'Rich' },
] as const satisfies readonly Option[];

export const EXTRA_OPTIONS = [
  { id: 'focus', label: 'Focus areas', own: 'Leadership' },
  { id: 'featured', label: 'Featured items', own: 'Profile Cards' },
  { id: 'stats', label: 'Highlights', own: 'Highlights' },
  { id: 'quote', label: 'Quote or motto', own: 'Motto' },
] as const satisfies readonly Option[];

/** Gallery categories a design can belong to, in the order the Studio shows them. */
export const DESIGN_CATEGORY_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'microsoft', label: 'Microsoft' },
  { id: 'azure', label: 'Azure & Foundry' },
  { id: 'github', label: 'GitHub' },
  { id: 'developer', label: 'Developer' },
  { id: 'anyrole', label: 'Any role' },
  { id: 'creative', label: 'Creative' },
  { id: 'classic', label: 'Classic' },
  { id: 'finance', label: 'Finance & consulting' },
  { id: 'legal', label: 'Legal' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'education', label: 'Education & research' },
  { id: 'property', label: 'Property & construction' },
  { id: 'hospitality', label: 'Hospitality & travel' },
  { id: 'nonprofit', label: 'Nonprofits & community' },
  { id: 'technology', label: 'Technology' },
] as const satisfies readonly Option[];

export type IconStyle = (typeof ICON_STYLE_OPTIONS)[number]['id'];
export type DesignCategory = (typeof DESIGN_CATEGORY_OPTIONS)[number]['id'];
export type PhotoShape = (typeof SHAPE_OPTIONS)[number]['id'];
export type PhotoLook = (typeof LOOK_OPTIONS)[number]['id'];
export type PhotoAnim = (typeof ANIM_OPTIONS)[number]['id'];
export type PhotoSize = (typeof PHOTO_SIZE_OPTIONS)[number]['id'];
export type ReplyStyle = (typeof REPLY_STYLE_OPTIONS)[number]['id'];
export type PaletteGroup = (typeof PALETTE_GROUP_OPTIONS)[number]['id'];
export type IconWeight = (typeof ICON_WEIGHT_OPTIONS)[number]['id'];
export type IconColor = (typeof ICON_COLOR_OPTIONS)[number]['id'];
export type ExtraKind = (typeof EXTRA_OPTIONS)[number]['id'];

const ids = <T extends { readonly id: string }>(list: readonly T[]): readonly T['id'][] => list.map((o) => o.id);

/** Icon styles: each design's own (`auto`), or one style for every design. */
export const ICON_STYLES = ids(ICON_STYLE_OPTIONS);
export const ICON_WEIGHTS = ids(ICON_WEIGHT_OPTIONS);
export const ICON_COLORS = ids(ICON_COLOR_OPTIONS);
export const SHAPES = ids(SHAPE_OPTIONS);
export const LOOKS = ids(LOOK_OPTIONS);
export const ANIMS = ids(ANIM_OPTIONS);
/** Reply versions: one line (default), two lines, a colour bar, a small photo, name only, or the design's own. */
export const REPLY_STYLES = ids(REPLY_STYLE_OPTIONS);

/**
 * Photo scale for each size in new messages. Replies keep their small photo.
 * A Polaroid frame gets a little extra so the photo inside stays large.
 */
export const PHOTO_SIZES: Readonly<Record<PhotoSize, number>> = { S: 0.85, M: 1, L: 1.2, XL: 1.4 };

/** Fields with a show switch beside them in the Studio. A hidden field is left out of every design. */
export const SHOWABLE = [
  'pronouns',
  'altName',
  'title',
  'team',
  'company',
  'region',
  'location',
  'phone',
  'office',
  'email',
  'website',
  'booking',
  'hours',
  'languages',
  'linkedin',
  'github',
  'x',
  'youtube',
  'learn',
  'blog',
  'tagline',
  'banner',
  'disclaimer',
  'quote',
] as const;
export type ShowableField = (typeof SHOWABLE)[number];

/** What a saved style remembers: the look, never your details. */
export const STYLE_KEYS: readonly (keyof SignatureState)[] = [
  'template',
  'colors',
  'gradient',
  'cols',
  'photoPos',
  'photoSize',
  'replyStyle',
  'iconStyle',
  'iconFamily',
  'iconWeight',
  'iconColor',
  'photoShape',
  'photoLook',
  'photoAnim',
  'nameStyle',
  'font',
  'textSize',
  'handStyle',
  'handPen',
  'bgMode',
  'bgColor',
];

/** The show switches a saved style remembers. */
export const STYLE_SHOW: readonly (keyof ShowFlags)[] = ['flourish', 'logo', 'animate'];
