/* Classic Refresh: the kit's card with its default settings. Copy this file to start a new design. */
import { card, defineDesign } from './kit.ts';

export const classicDesign = defineDesign({
  id: 'classic',
  name: 'Classic Refresh',
  theme: 'msblue',
  anim: 'none',
  cols: 1,
  icons: 'glyph',
  cats: ['microsoft', 'classic'],
  badge: '',
  tag: 'Your current layout, updated',
  blurb: 'Your current layout, updated: round photo, name \u00b7 Microsoft and one icon row.',
  ...card({ photo: 72, shape: 'circle', ring: false, nameSize: 16, gap: 14 }),
});
