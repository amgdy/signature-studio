/** Reviewed sources, not a promise that every client renders identically. */
export const COMPATIBILITY_REVIEWED = '2026-11-22';

export const COMPATIBILITY_SOURCES = [
  {
    title: 'Microsoft: system fonts and fallback stacks',
    url: 'https://learn.microsoft.com/dynamics365/customer-insights/journeys/use-custom-fonts',
  },
  {
    title: 'Microsoft: animated graphics in Outlook',
    url: 'https://support.microsoft.com/en-au/outlook/the-animated-graphic-in-my-e-mail-message-doesn-t-work',
  },
  {
    title: 'Microsoft: blocked external pictures in classic Outlook',
    url: 'https://support.microsoft.com/en-us/outlook/block-or-unblock-automatic-picture-downloads-in-classic-outlook-email-messages',
  },
  { title: 'Apple: signatures in Mail on Mac', url: 'https://support.apple.com/guide/mail/mail11943/mac' },
  { title: 'Apple: signatures on iPhone', url: 'https://support.apple.com/guide/iphone/iph80dabb18b/ios' },
  { title: 'Apple: signatures on iPad', url: 'https://support.apple.com/guide/ipad/ipad63538f0f/ipados' },
  { title: 'Can I email: embedded base64 image rendering', url: 'https://www.caniemail.com/features/image-base64/' },
] as const;

export const CLIENT_PROFILES = [
  {
    id: 'outlook-new-web',
    name: 'New Outlook and Outlook on the web',
    family: 'Outlook',
    profile: 'outlook',
    layout:
      'Inline table layouts. Our paste model removes classes, stylesheets, non-image floats and span/link nowrap.',
    fonts: 'Local font stacks with a generic fallback. Do not depend on downloaded web fonts.',
    images: 'PNG, JPEG and GIF output. Paste and send a test to verify embedded-image conversion.',
    motion: 'Animation depends on format, app and settings. The finished static frame must remain useful.',
    validation:
      'Automated: a conservative paste model and browser layout checks. Manual: paste, send, receive and reply.',
  },
  {
    id: 'outlook-classic',
    name: 'Classic Outlook for Windows',
    family: 'Outlook',
    profile: 'outlook-classic',
    layout:
      'Use the conservative Word-compatible subset: tables, inline styles and explicit image dimensions. Rounded corners may become square.',
    fonts:
      'Prefer installed fonts with fallbacks. Font availability and Word text metrics can differ from the browser.',
    images:
      'The classic Outlook package includes image files. Hosted images may be blocked until the reader permits downloads.',
    motion:
      'Current Microsoft 365 / Outlook 2024 / 2021 can play GIFs when animation is enabled. This does not establish APNG support. Older versions and disabled animation need the finished static frame.',
    validation:
      'No Word rendering engine is embedded here. Real-client installation, send and reply tests are required.',
  },
  {
    id: 'outlook-mac',
    name: 'Outlook for Mac',
    family: 'Outlook',
    profile: 'outlook',
    layout:
      'Inline tables. Our observed paste model removes max-width; image width and height must remain proportional.',
    fonts: 'Windows fonts may be absent. The next installed family in the stack is used.',
    images: 'Explicit dimensions and min-width protect the image aspect ratio in the observed Mac paste behavior.',
    motion: 'Keep a legible static frame. Verify animation and reduced-motion behavior in the installed app.',
    validation: 'Automated: an observed Mac paste model. Manual: actual paste, send, dark mode and reply.',
  },
  {
    id: 'outlook-mobile',
    name: 'Outlook on iOS and Android',
    family: 'Outlook',
    profile: 'outlook',
    layout:
      'Check the received HTML at phone width. Mobile signature editors and received-message rendering are different surfaces.',
    fonts: 'Use fallback stacks; desktop font availability is not assumed.',
    images:
      'Check the received message with images both shown and blocked. Plain-text copy is available if the signature editor removes formatting.',
    motion:
      'App versions and accessibility settings can change animation. Avoid APNG revert-to-previous frames, based on the project’s iPhone observations.',
    validation:
      '343 px is our test width, not an Outlook guarantee. Native mobile compose, paste and receive tests remain manual.',
  },
  {
    id: 'apple-mail-mac',
    name: 'Apple Mail on Mac',
    family: 'Apple Mail',
    profile: 'apple-mail',
    layout:
      'The signature editor supports formatted text and links. Paste the rendered signature, not the HTML source. Verify tables and spacing after saving.',
    fonts:
      'Turn off “Always match my default message font” to retain pasted styling. Fonts still depend on what is installed.',
    images:
      'The Mac editor accepts images. Received-message support for embedded images does not prove that the signature editor preserves pasted image data.',
    motion: 'Verify APNG after saving and sending; use a still signature if motion is not reliable.',
    validation: 'Send in rich text, then check the received message, dark mode, image delivery, links and replies.',
  },
  {
    id: 'apple-mail-mobile',
    name: 'Apple Mail on iPhone and iPad',
    family: 'Apple Mail',
    profile: 'apple-mail',
    layout: 'The signature editor is text only, even when the app can display rich signatures in received mail.',
    fonts: 'Custom type, colours and spacing are not supported in the signature editor.',
    images: 'Photos, logos, icons and handwritten names are not supported in the signature editor.',
    motion: 'The text-only signature editor does not support animation.',
    validation:
      'Use Plain text, then send a test from the device. Verify any address or URL you expect to become a link.',
  },
] as const;

export const SIGNATURE_REQUIREMENTS = [
  {
    title: 'Layout',
    text: 'Inline tables, no layout dependency on flex, grid, positioning or external CSS. Short contact items stay in cells.',
  },
  {
    title: 'Text',
    text: 'Editable text with local font fallbacks. At least 11 px is the Studio readability policy, not a WCAG or Outlook minimum.',
  },
  {
    title: 'Images',
    text: 'Raster output, explicit width and height, 2x pixels where possible, meaningful alt text or marked decoration.',
  },
  {
    title: 'Colour',
    text: 'WCAG AA text contrast: 4.5:1, or 3:1 for large text. Browser light/dark checks cannot predict every client colour transformation or assess words inside images.',
  },
  {
    title: 'Motion',
    text: 'Brief mode must stop within five seconds. A finished static frame is required for clients or settings that do not animate.',
  },
  {
    title: 'Phone fit',
    text: 'No overflow at 343 px in the preview and observed Outlook paste models. Check both new messages and replies.',
  },
  {
    title: 'Payload',
    text: 'The 400 KB warning is a Studio budget, not an official Outlook limit. Hosted-image reachability is not checked offline.',
  },
  {
    title: 'Final test',
    text: 'Paste, save, send to a second account, receive, reply and forward in each target app. Check dark mode, image blocking, keyboard use and screen-reader order.',
  },
] as const;

/** Observable paste transformations, shared by live checks and the regression audits. Not native-client emulation. */
export type EditorMode = 'css' | 'outlook' | 'roost' | 'mac';

export interface KeepOptions {
  editorWidth?: number;
  markNoWrap?: boolean;
}

export function keepAsOutlook(html: string, mode: EditorMode, o: KeepOptions = {}): string {
  if (mode === 'css' && !o.markNoWrap) return html;
  const t = document.createElement('template');
  t.innerHTML = html;
  if (mode !== 'css') for (const el of t.content.querySelectorAll('style, script, link, svg')) el.remove();
  for (const el of t.content.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) continue;
    const tag = el.tagName;
    const s = el.style;
    if (
      o.markNoWrap &&
      (tag === 'SPAN' || tag === 'A') &&
      /white-space:\s*nowrap/i.test(el.getAttribute('style') ?? '')
    )
      el.setAttribute('data-nw', '1');
    if (mode === 'css') continue;
    el.removeAttribute('class');
    if (/^(inline-)?(flex|grid)$/.test(s.display)) s.removeProperty('display');
    s.removeProperty('position');
    s.removeProperty('max-width');
    if (mode === 'mac') {
      if (tag === 'IMG') s.setProperty('max-width', '100%');
      continue;
    }
    if (tag === 'TABLE') el.removeAttribute('align');
    if (tag !== 'IMG') s.removeProperty('float');
    s.removeProperty('min-width');
    if (s.display === 'inline-block') s.removeProperty('display');
    if (tag !== 'TD') s.removeProperty('white-space');
    if (mode === 'roost' && tag === 'IMG') s.setProperty('max-width', `${o.editorWidth ?? 900}px`);
  }
  return t.innerHTML;
}
