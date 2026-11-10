/* The Extras section: the message and sign-off, image optimising, and featured content any design can show. */
import { useId } from 'react';
import type { ReactNode } from 'react';
import { Label } from '../components/ui/label.tsx';
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select.tsx';
import { EXTRAS } from '../engine.ts';
import type { ExtraKind, Placement } from '../engine.ts';
import {
  DEV_FIELDS,
  FEATURED_HEADING,
  FOCUS_FIELDS,
  ITEMS,
  MESSAGE_FIELDS,
  QUOTE_FIELDS,
  featuredItemFields,
  statFields,
} from '../fields.ts';
import { useSignatureStore } from '../store.ts';
import { FieldList, Note, Pane, Section, ShowSwitch, SubHeading, SwitchField } from '../ui.tsx';

const isPlacement = (v: string): v is Placement => v === 'auto' || v === 'all';

/** One kind of featured content, with where it shows: in the designs made for it, or in every design. */
function ExtraGroup({ kind, note, children }: { kind: ExtraKind; note: string; children: ReactNode }) {
  const placeId = useId();
  const extra = EXTRAS.find((x) => x.id === kind);
  const place = useSignatureStore((st) => st.state.place[kind]);
  const setPlace = useSignatureStore((st) => st.setPlace);
  if (!extra) return null;
  return (
    <section className="flex flex-col gap-2.5" aria-label={extra.label} data-extra={kind}>
      <SubHeading>{extra.label}</SubHeading>
      <div className="grid max-w-80 gap-1.5">
        <Label htmlFor={placeId}>Show in</Label>
        <NativeSelect
          id={placeId}
          className="w-full"
          value={place}
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (isPlacement(v)) setPlace(kind, v);
          }}
          data-place={kind}
        >
          <NativeSelectOption value="auto">Designs made for it ({extra.own})</NativeSelectOption>
          <NativeSelectOption value="all">Every design</NativeSelectOption>
        </NativeSelect>
      </div>
      <Note>{note}</Note>
      {children}
    </section>
  );
}

/** Focus areas, featured items, highlights and a quote, which any design can show, plus the developer prompts. */
function FeaturedContent() {
  return (
    <>
      <ExtraGroup kind="focus" note="What you lead, your specialties or services: a short list, separated by commas.">
        <FieldList fields={FOCUS_FIELDS} />
      </ExtraGroup>
      <ExtraGroup
        kind="featured"
        note="Up to three projects, repositories, talks, publications or products. Profile Cards shows them as cards; other designs as a short list."
      >
        <FieldList fields={[FEATURED_HEADING]} />
        {ITEMS.map((n) => (
          <div key={n} className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Item {n}</p>
            <FieldList fields={featuredItemFields(n)} />
          </div>
        ))}
        <div className="flex flex-col gap-2.5">
          <ShowSwitch flag="featDesc" label="Show descriptions" />
          <ShowSwitch flag="featTag" label="Show tags" />
          <ShowSwitch flag="activity" label="Activity grid in Profile Cards" />
        </div>
      </ExtraGroup>
      <ExtraGroup kind="stats" note="Numbers that sum you up, each with a short label.">
        <FieldList fields={ITEMS.flatMap((n) => statFields(n))} />
      </ExtraGroup>
      <ExtraGroup kind="quote" note="A line you live by, or a quote with who said it.">
        <FieldList fields={QUOTE_FIELDS} />
      </ExtraGroup>
      <SubHeading>Developer designs</SubHeading>
      <Note>The question the Agent answers, and the grey Copilot suggestion at the end of the Code Editor.</Note>
      <FieldList fields={DEV_FIELDS} />
    </>
  );
}

export function ExtrasPane() {
  const optimize = useSignatureStore((st) => st.optimize);
  const setOptimize = useSignatureStore((st) => st.setOptimize);
  return (
    <Pane id="extras">
      <Section title="Message and sign-off" hint="switch on to show">
        <FieldList fields={MESSAGE_FIELDS} />
        <div className="flex flex-col gap-2">
          <SwitchField
            label="Optimise images (smaller emails)"
            checked={optimize}
            onCheckedChange={(on) => setOptimize(on)}
            data-testid="optimize"
          />
          <Note>Saves images in fewer colours where it does not show, so each email is lighter.</Note>
        </div>
      </Section>
      <Section title="Featured content" hint="any design">
        <FeaturedContent />
      </Section>
    </Pane>
  );
}
