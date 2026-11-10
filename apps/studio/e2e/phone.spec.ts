import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { goTo, open, option, settled, signature } from './helpers.ts';

// A complete, neutral profile with every optional line on, as in the engine's phone audit, so the widest content is tested.
const PROFILE: Record<string, unknown> = {
  fullName: 'Sam Taylor',
  pronouns: 'they/them',
  altName: 'سام تايلور',
  title: 'Principal Engineer, Cloud & AI',
  team: 'Platform Engineering',
  company: 'Contoso',
  region: 'Europe',
  location: 'Lisbon, Portugal',
  phone: '+1 425 555 0142',
  office: '+1 425 555 0100',
  email: 'sam.taylor@contoso.com',
  website: 'contoso.com',
  booking: 'outlook.office.com/bookwithme/user/abc',
  hours: 'Mon–Fri, 9:00–17:00 (WET)',
  languages: 'English, Portuguese',
  linkedin: 'linkedin.com/in/sample',
  github: 'github.com/sample',
  x: 'x.com/sample',
  youtube: 'youtube.com/@sample',
  learn: 'learn.microsoft.com/users/sample',
  blog: 'contoso.com/blog',
  banner: 'Book a cloud architecture briefing',
  bannerUrl: 'https://contoso.com',
  disclaimer:
    'This message may contain confidential information. If you are not the intended recipient, please delete it and let the sender know.',
  tagline: 'Building things people love to use',
  initials: '',
  quote: 'Make it simple, then make it fast.',
  stat1: '12+',
  stat1label: 'years in cloud',
  stat2: '40',
  stat2label: 'teams supported',
  stat3: '3',
  stat3label: 'open-source tools',
  focusLabel: 'Leading',
  focus: 'Architecture, Developer experience, Community, Skilling',
  featLabel: 'Featured',
  handle: '',
  quoteBy: '',
  devPrompt: 'who can help us ship AI apps?',
  devGhost: 'let’s build something great together',
  feat1: 'cloud-cost-toolkit',
  feat1desc: 'Cloud cost toolkit',
  feat1url: 'github.com/sample/cloud-cost-toolkit',
  feat1tag: 'Open source',
  feat2: 'usage-insights',
  feat2desc: 'Usage insights dashboard',
  feat2url: 'github.com/sample/usage-insights',
  feat2tag: 'Open source',
  feat3: '',
  feat3desc: '',
  feat3url: '',
  feat3tag: '',
  signoff: 'Best,',
  signoffName: 'Sam',
  show: {
    banner: true,
    disclaimer: true,
    x: true,
    booking: true,
    tagline: true,
    signoff: true,
  },
};

test.beforeEach(async ({ page }) => {
  await open(page, PROFILE);
});

const designIds = (page: Page): Promise<string[]> =>
  page
    .getByTestId('gallery')
    .locator('[data-kind="tpl"]')
    .evaluateAll((cards) => cards.map((c) => (c.getAttribute('data-testid') ?? '').replace(/^design-/, '')));

/** How far the signature reaches past the right edge of its box, in pixels. */
const overflow = (page: Page): Promise<number> =>
  signature(page).evaluate((el) => {
    const host = [...el.querySelectorAll('*')].find((n) => n.shadowRoot);
    if (!host?.shadowRoot) return Number.NaN;
    const box = host.getBoundingClientRect();
    let right = box.right;
    for (const n of host.shadowRoot.querySelectorAll('*')) right = Math.max(right, n.getBoundingClientRect().right);
    return Math.round(right - box.right);
  });

// Every design in 1, 2 and 3 columns, split into parts that run side by side.
const PARTS = 4;
for (let part = 0; part < PARTS; part++) {
  test(`every design fits a 375 px phone in 1, 2 and 3 columns, part ${part + 1} of ${PARTS}`, async ({ page }) => {
    const ids = await designIds(page);
    const mine = ids.filter((_, i) => i % PARTS === part);
    await option(page, 'seg-device', 'phone').click();
    const over: string[] = [];
    // Picking a design keeps the columns, so each column count is set once in Layout & colour.
    for (const cols of ['1', '2', '3']) {
      await goTo(page, 'layout');
      await option(page, 'seg-columns', cols).click();
      await goTo(page, 'design');
      for (const id of mine) {
        await page.getByTestId(`design-${id}`).click();
        await settled(page);
        const px = await overflow(page);
        if (!(px <= 2)) over.push(`${id}/${cols} +${px}`);
      }
    }
    expect(mine.length).toBeGreaterThan(0);
    expect(over).toEqual([]);
  });
}
