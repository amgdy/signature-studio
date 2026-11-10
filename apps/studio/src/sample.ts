/*
 * Starting points: a random, plainly fictitious sample person for a first visit or "Try a random sample", and a
 * blank signature. Both start from the default settings; only the details differ.
 */
import { DEFAULTS, toState } from './engine.ts';
import type { SignatureState } from './engine.ts';
import { DETAIL_KEYS } from './fields.ts';
import type { DetailKey } from './fields.ts';

/** Returns a number in [0, 1), like Math.random. */
export type Rng = () => number;

export function pick<T>(list: readonly T[], rng: Rng): T {
  const v = list[Math.floor(rng() * list.length) % list.length];
  if (v === undefined) throw new Error('Cannot pick from an empty list');
  return v;
}

type Place = readonly [region: string, location: string];

/** Names and places that belong together, so a sample person never mixes cultures. */
interface Culture {
  first: readonly string[];
  last: readonly string[];
  places: readonly Place[];
}

const MEA = 'Middle East and Africa';
const APAC = 'Asia Pacific';
const EUROPE = 'Europe';
const LATAM = 'Latin America';
const NA = 'North America';

export const CULTURES: readonly Culture[] = [
  {
    first: ['Omar', 'Fatima', 'Aisha', 'Yousef', 'Layla', 'Karim', 'Nour', 'Hassan'],
    last: ['Haddad', 'Rahman', 'Mansour', 'Khalil', 'Nasser', 'Saleh'],
    places: [
      [MEA, 'Dubai, United Arab Emirates'],
      [MEA, 'Riyadh, Saudi Arabia'],
      [MEA, 'Cairo, Egypt'],
      [MEA, 'Amman, Jordan'],
    ],
  },
  {
    first: ['Kenji', 'Hana', 'Yuki', 'Haruto', 'Aiko', 'Ren'],
    last: ['Tanaka', 'Sato', 'Suzuki', 'Watanabe', 'Ito'],
    places: [
      [APAC, 'Tokyo, Japan'],
      [APAC, 'Osaka, Japan'],
    ],
  },
  {
    first: ['Mateo', 'Diego', 'Camila', 'Lucia'],
    last: ['Garcia', 'Torres', 'Morales', 'Ramirez'],
    places: [
      [LATAM, 'Mexico City, Mexico'],
      [EUROPE, 'Madrid, Spain'],
    ],
  },
  {
    first: ['Sofia', 'Marco', 'Giulia', 'Luca'],
    last: ['Rossi', 'Bianchi', 'Romano'],
    places: [[EUROPE, 'Milan, Italy']],
  },
  {
    first: ['Rafael', 'Beatriz', 'Tiago', 'Ines'],
    last: ['Silva', 'Costa', 'Santos'],
    places: [
      [EUROPE, 'Lisbon, Portugal'],
      [LATAM, 'São Paulo, Brazil'],
    ],
  },
  {
    first: ['Priya', 'Arjun', 'Ananya', 'Rohan', 'Kavya'],
    last: ['Patel', 'Sharma', 'Iyer', 'Rao'],
    places: [
      [APAC, 'Bengaluru, India'],
      [APAC, 'Mumbai, India'],
    ],
  },
  {
    first: ['Ingrid', 'Astrid', 'Erik', 'Freya', 'Lars'],
    last: ['Johansson', 'Lindqvist', 'Nilsson', 'Berg'],
    places: [
      [EUROPE, 'Stockholm, Sweden'],
      [EUROPE, 'Oslo, Norway'],
    ],
  },
  {
    first: ['Lukas', 'Lena', 'Jonas', 'Mia'],
    last: ['Weber', 'Becker', 'Fischer', 'Wagner'],
    places: [
      [EUROPE, 'Berlin, Germany'],
      [EUROPE, 'Munich, Germany'],
    ],
  },
  {
    first: ['Kwame', 'Amara', 'Ama', 'Kofi', 'Chidi', 'Ngozi'],
    last: ['Mensah', 'Okafor', 'Boateng', 'Adeyemi'],
    places: [
      [MEA, 'Accra, Ghana'],
      [MEA, 'Lagos, Nigeria'],
    ],
  },
  {
    first: ['Minjun', 'Jiwoo', 'Seoyeon'],
    last: ['Kim', 'Park', 'Lee'],
    places: [[APAC, 'Seoul, South Korea']],
  },
  {
    first: ['Mei', 'Wei', 'Lin', 'Jun'],
    last: ['Chen', 'Wang', 'Li', 'Zhang'],
    places: [
      [APAC, 'Singapore'],
      [APAC, 'Shanghai, China'],
    ],
  },
  {
    first: ['Liam', 'Noah', 'Emma', 'Olivia', 'Grace'],
    last: ['Brooks', 'Bennett', 'Hughes', 'Carter'],
    places: [
      [NA, 'Seattle, United States'],
      [NA, 'Toronto, Canada'],
      [EUROPE, 'London, United Kingdom'],
      [APAC, 'Sydney, Australia'],
    ],
  },
];

/** Microsoft's fictitious company names. */
const COMPANIES = [
  'Contoso',
  'Fabrikam',
  'Northwind Traders',
  'Adventure Works',
  'Tailspin Toys',
  'Woodgrove Bank',
  'Litware',
  'Proseware',
  'Wide World Importers',
  'Alpine Ski House',
  'Fourth Coffee',
  'Relecloud',
  'Trey Research',
] as const;

type Item = readonly [name: string, desc: string, tag: string];
type Stat = readonly [value: string, label: string];

interface Role {
  title: string;
  team: string;
  tagline: string;
  focus: string;
  items: readonly [Item, Item];
  stats: readonly [Stat, Stat, Stat];
  quote: string;
  prompt: string;
}

const ROLES: readonly Role[] = [
  {
    title: 'Senior Software Engineer',
    team: 'Developer Platform',
    tagline: 'Making developers faster, one tool at a time',
    focus: 'APIs, Developer tools, Testing, Open source',
    items: [
      ['build-cache', 'Faster builds for big repositories', 'Open source'],
      ['api-starter', 'A starter kit for web APIs', 'Open source'],
    ],
    stats: [
      ['8+', 'years shipping software'],
      ['25', 'services launched'],
      ['4', 'open-source tools'],
    ],
    quote: 'Ship small, learn fast.',
    prompt: 'who can help us speed up our builds?',
  },
  {
    title: 'Product Manager',
    team: 'Customer Experience',
    tagline: 'Turning feedback into features',
    focus: 'Roadmaps, Research, Analytics, Launches',
    items: [
      ['Mobile app 2.0', 'Our biggest release yet', 'Launch'],
      ['Feedback hub', 'Every customer voice in one place', 'Product'],
    ],
    stats: [
      ['15', 'launches'],
      ['2M', 'monthly users'],
      ['98%', 'releases on time'],
    ],
    quote: 'Listen first, then build.',
    prompt: 'who can help us plan the next release?',
  },
  {
    title: 'Data Scientist',
    team: 'Insights and Analytics',
    tagline: 'Finding the story in the numbers',
    focus: 'Machine learning, Forecasting, Dashboards, Data quality',
    items: [
      ['demand-forecast', 'Weekly demand forecasts', 'Model'],
      ['data-checks', 'Automatic data quality checks', 'Open source'],
    ],
    stats: [
      ['30+', 'models in production'],
      ['6', 'years in data'],
      ['12', 'teams supported'],
    ],
    quote: 'Good data beats clever models.',
    prompt: 'who can help us forecast demand?',
  },
  {
    title: 'Lead UX Designer',
    team: 'Design Studio',
    tagline: 'Designing for everyone',
    focus: 'Accessibility, Design systems, Prototyping, Research',
    items: [
      ['Design kit', 'Shared components for every app', 'Design system'],
      ['Checkout redesign', 'Fewer steps, happier customers', 'Case study'],
    ],
    stats: [
      ['10', 'years in design'],
      ['40+', 'products shaped'],
      ['1', 'design system'],
    ],
    quote: 'Simple is hard. Do it anyway.',
    prompt: 'who can help us make our app easier to use?',
  },
  {
    title: 'Customer Success Manager',
    team: 'Enterprise Accounts',
    tagline: 'Here to help you get the most from every tool',
    focus: 'Onboarding, Adoption, Renewals, Training',
    items: [
      ['Quick start', 'Get set up in a day', 'Guide'],
      ['Office hours', 'Weekly drop-in sessions', 'Event'],
    ],
    stats: [
      ['60', 'customers supported'],
      ['95%', 'renewal rate'],
      ['200+', 'trainings run'],
    ],
    quote: 'Every question is a chance to help.',
    prompt: 'who can help our team get started?',
  },
  {
    title: 'Cloud Architect',
    team: 'Platform Engineering',
    tagline: 'Building on solid foundations',
    focus: 'Architecture, Security, Cost, Migration',
    items: [
      ['landing-zone', 'A secure start in the cloud', 'Template'],
      ['migration-playbook', 'Move apps step by step', 'Guide'],
    ],
    stats: [
      ['12+', 'years in cloud'],
      ['80', 'migrations led'],
      ['3', 'certifications'],
    ],
    quote: 'Plan for failure, design for change.',
    prompt: 'who can help us move to the cloud?',
  },
];

const SIGNOFFS = ['Best,', 'Thanks,', 'Kind regards,', 'Cheers,', 'All the best,'] as const;

function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type Details = Partial<Record<DetailKey, string>>;

/** Every detail field empty. */
export function emptyDetails(): Details {
  const out: Details = {};
  for (const k of DETAIL_KEYS) out[k] = '';
  return out;
}

const NTH = [1, 2, 3] as const;

/** A random, plainly fictitious person. Pass a seeded `rng` for the same person every time. */
export function randomSample(rng: Rng = Math.random): Details {
  const culture = pick(CULTURES, rng);
  const first = pick(culture.first, rng);
  const last = pick(culture.last, rng);
  const company = pick(COMPANIES, rng);
  const [region, location] = pick(culture.places, rng);
  const role = pick(ROLES, rng);
  const domain = `${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const phone = `+1 425 555 01${String(Math.floor(rng() * 100)).padStart(2, '0')}`;
  const out: Details = {
    ...emptyDetails(),
    fullName: `${first} ${last}`,
    title: role.title,
    team: role.team,
    company,
    region,
    location,
    phone,
    email: `${slug(first)}.${slug(last)}@${domain}`,
    website: domain,
    linkedin: 'linkedin.com/in/sample',
    github: 'github.com/sample',
    x: 'x.com/sample',
    tagline: role.tagline,
    quote: role.quote,
    focusLabel: 'Leading',
    focus: role.focus,
    featLabel: 'Featured',
    devPrompt: role.prompt,
    devGhost: 'let\u2019s build something great together',
    signoff: pick(SIGNOFFS, rng),
    signoffName: first,
  };
  role.items.forEach(([name, desc, tag], i) => {
    const n = NTH[i];
    if (!n) return;
    out[`feat${n}` as const] = name;
    out[`feat${n}desc` as const] = desc;
    out[`feat${n}url` as const] = tag === 'Open source' ? `github.com/sample/${slug(name)}` : `${domain}/${slug(name)}`;
    out[`feat${n}tag` as const] = tag;
  });
  role.stats.forEach(([value, label], i) => {
    const n = NTH[i];
    if (!n) return;
    out[`stat${n}` as const] = value;
    out[`stat${n}label` as const] = label;
  });
  return out;
}

/** A first visit, and "Try a random sample": every setting at its default, with a random made-up person. */
export function sampleState(rng: Rng = Math.random): SignatureState {
  return toState({ ...DEFAULTS, ...randomSample(rng) });
}

/** "New blank signature": every setting at its default, every detail empty, and no photo or logo. */
export function blankState(): SignatureState {
  return toState({
    ...DEFAULTS,
    ...emptyDetails(),
    show: { ...DEFAULTS.show, photo: false, logo: false },
  });
}
