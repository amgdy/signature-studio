/* Step-by-step help for adding the signature to each Outlook, in the Use section. */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs.tsx';
import { designById } from './engine.ts';
import { useSignatureStore } from './store.ts';

type GuideTab = 'new' | 'classic' | 'mac' | 'tips';

const PANEL =
  'pt-1 pb-3 text-sm leading-relaxed [&_kbd]:rounded-sm [&_kbd]:border [&_kbd]:px-1 [&_kbd]:font-mono [&_kbd]:text-xs [&_code]:font-mono [&_code]:text-xs [&_li]:mb-1.5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5.5 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5.5';

const S = ' › ';

function steps(tab: GuideTab, design: string): ReactNode {
  switch (tab) {
    case 'new':
      return (
        <ol>
          <li>
            Select <b>Copy signature</b>.
          </li>
          <li>
            In Outlook, open <b>Settings</b>
            {S}
            <b>Accounts</b>
            {S}
            <b>Signatures</b> (Outlook on the web: <b>Settings</b>
            {S}
            <b>Account</b>
            {S}
            <b>Signatures</b>), select <b>New signature</b>, name it and press <kbd>Ctrl</kbd>+<kbd>V</kbd>.
          </li>
          <li>
            Select <b>Copy reply signature</b> and save it as a second signature, for example “{design} (Reply)”.
          </li>
          <li>
            Under <b>Select default signatures</b>, pick the first for new messages and the reply one for replies and
            forwards.
          </li>
        </ol>
      );
    case 'classic':
      return (
        <ol>
          <li>
            <b>Quick way:</b> copy each version and paste it under <b>File</b>
            {S}
            <b>Options</b>
            {S}
            <b>Mail</b>
            {S}
            <b>Signatures</b>
            {S}
            <b>New</b>.
          </li>
          <li>
            <b>Most reliable for images:</b> select <b>Classic Outlook (.zip)</b>; it holds both the new-message and
            reply signatures. Close Outlook.
          </li>
          <li>
            Press <kbd>Win</kbd>+<kbd>R</kbd>, enter <code>%APPDATA%\Microsoft\Signatures</code> and extract the package
            there, keeping each <code>.htm</code> file next to its <code>_files</code> folder.
          </li>
          <li>Reopen Outlook and set the defaults for new messages and for replies and forwards.</li>
        </ol>
      );
    case 'mac':
      return (
        <ul>
          <li>
            <b>Outlook for Mac:</b> <b>Outlook</b>
            {S}
            <b>Settings</b>
            {S}
            <b>Signatures</b>
            {S}
            <b>+</b>, paste, then set the defaults for new messages and replies.
          </li>
          <li>
            <b>Outlook mobile:</b> if its signature editor removes formatting, select <b>Plain text</b> and paste it
            under <b>Settings</b>
            {S}your account{S}
            <b>Signature</b>.
          </li>
          <li>
            <b>Reading on phones:</b> Outlook’s editor (new Outlook, Outlook on the web and mobile) keeps tables but
            removes the code that lets blocks rearrange, so every template is built from table cells that look the same
            everywhere and fit phone screens from 343&nbsp;px wide. In <b>2 columns</b> your photo sits beside your name
            and title, with the two columns underneath. Check it with <b>Phone</b> above the preview.
          </li>
        </ul>
      );
    default:
      return (
        <ul>
          <li>
            <b>Accessible by design:</b> every image has alt text (decoration is marked so screen readers skip it), text
            meets WCAG AA contrast on every background, nothing is smaller than 11&nbsp;px, the signature is tagged as
            English and a name in Arabic is tagged right-to-left. Animations stop within 5 seconds unless you choose{' '}
            <b>Keep animations looping</b>.
          </li>
          <li>
            <b>Transparent</b> background lets the email’s own background show through. <b>Solid colour</b> sets it on a
            rounded card (classic Outlook for Windows draws square corners); on dark colours the text switches to light
            automatically.
          </li>
          <li>
            Icons are vector designs rendered at double resolution, because Outlook removes SVG and CSS animation.
            Shimmer, sparkle, photo rings, the mesh, the contribution grid and handwriting use animated PNGs. Clients or
            settings that do not animate show the finished picture. GIF support in current classic Outlook does not
            imply APNG support.
          </li>
          <li>
            The <b>Dark</b> preview checks the design’s dark palette. Outlook may recolour it differently; send a test
            in the app you use. Your edits and styles are saved in this browser.
          </li>
        </ul>
      );
  }
}

const TABS: readonly { id: GuideTab; label: string }[] = [
  { id: 'new', label: 'New Outlook and web' },
  { id: 'classic', label: 'Classic Outlook' },
  { id: 'mac', label: 'Mac and mobile' },
  { id: 'tips', label: 'Tips' },
];

/** Step-by-step help for adding the signature to each Outlook. */
export function OutlookGuide() {
  const [tab, setTab] = useState<GuideTab>('new');
  const design = useSignatureStore((st) => designById(st.state.template)?.name ?? 'Signature');
  return (
    <Accordion
      defaultValue={['guide']}
      className="rounded-xl bg-card px-4 ring-1 ring-foreground/10"
      data-testid="outlook-guide"
    >
      <AccordionItem value="guide">
        <AccordionTrigger headingLevel={2} className="py-3 text-base font-semibold">
          Add it to Outlook
        </AccordionTrigger>
        <AccordionContent>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              const next = TABS.find((t) => t.id === v);
              if (next) setTab(next.id);
            }}
          >
            <TabsList
              activateOnFocus
              aria-label="Outlook versions"
              className="grid w-full grid-cols-2 group-data-horizontal/tabs:h-auto"
            >
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  id={`guide-tab-${t.id}`}
                  className="min-w-0 py-1 whitespace-normal"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TABS.map((t) => (
              <TabsContent key={t.id} value={t.id} className={PANEL} data-testid="guide-panel">
                {steps(t.id, design)}
              </TabsContent>
            ))}
          </Tabs>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
