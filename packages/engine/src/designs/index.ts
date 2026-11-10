import { agentDesign } from './agent.ts';
import { auroraDesign } from './aurora.ts';
import { azureDesign } from './azure.ts';
import { badgeDesign } from './badge.ts';
import { boldDesign } from './bold.ts';
import { builderDesign } from './builder.ts';
import { classicDesign } from './classic.ts';
import { editorDesign } from './editor.ts';
import { editorialDesign } from './editorial.ts';
import { executiveDesign } from './executive.ts';
import { foundryDesign } from './foundry.ts';
import { githubDesign } from './github.ts';
import { impactDesign } from './impact.ts';
import { leaderDesign } from './leader.ts';
import { minimalDesign } from './minimal.ts';
import { monogramDesign } from './monogram.ts';
import { passportDesign } from './passport.ts';
import { postcardDesign } from './postcard.ts';
import { quoteDesign } from './quote.ts';
import { scriptDesign } from './script.ts';
import { splitDesign } from './split.ts';
import { terminalDesign } from './terminal.ts';
import { ticketDesign } from './ticket.ts';
import { tilesDesign } from './tiles.ts';
import { ledgerDesign } from './ledger.ts';
import { adviserDesign } from './adviser.ts';
import { counselDesign } from './counsel.ts';
import { careDesign } from './care.ts';
import { facultyDesign } from './faculty.ts';
import { blueprintDesign } from './blueprint.ts';
import { folioDesign } from './folio.ts';
import { studioCardDesign } from './studio-card.ts';
import { conciergeDesign } from './concierge.ts';
import { communityDesign } from './community.ts';
import { systemsDesign } from './systems.ts';
import { circuitDesign } from './circuit.ts';

/** Every design, in gallery order. */
export const TEMPLATES = [
  auroraDesign,
  tilesDesign,
  leaderDesign,
  githubDesign,
  foundryDesign,
  azureDesign,
  splitDesign,
  scriptDesign,
  classicDesign,
  executiveDesign,
  builderDesign,
  minimalDesign,
  monogramDesign,
  editorialDesign,
  ticketDesign,
  impactDesign,
  quoteDesign,
  boldDesign,
  passportDesign,
  badgeDesign,
  postcardDesign,
  terminalDesign,
  editorDesign,
  agentDesign,
  ledgerDesign,
  adviserDesign,
  counselDesign,
  careDesign,
  facultyDesign,
  blueprintDesign,
  folioDesign,
  studioCardDesign,
  conciergeDesign,
  communityDesign,
  systemsDesign,
  circuitDesign,
];

export const byId = Object.fromEntries(TEMPLATES.map((d) => [d.id, d]));
