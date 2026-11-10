/* The Name section: typed or handwritten name, the handwriting style, pen and flourish. */
import { useCallback, useId } from 'react';
import manropeLicense from '@fontsource-variable/manrope/LICENSE?raw';
import montserratLicense from '@fontsource-variable/montserrat/LICENSE?raw';
import { Label } from '../components/ui/label.tsx';
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select.tsx';
import {
  FONT_OPTIONS,
  HAND_STYLES,
  PENS,
  TEXT_SIZE_OPTIONS,
  activeTheme,
  canHandwrite,
  handCredit,
  handLicense,
  previewHand,
} from '../engine.ts';
import type { HandPen, NameStyle } from '../engine.ts';
import { nameMode, nameNote } from '../fields.ts';
import { useDebouncedValue } from '../hooks.tsx';
import { useSignatureStore } from '../store.ts';
import { AsyncImage, ControlGroup, Note, Pane, PickerGrid, Section, Segmented, ShowSwitch } from '../ui.tsx';

const FORCED_TITLE = 'The Handwritten template always writes your name';

function Ink({ text, style, pen, color }: { text: string; style: string; pen: HandPen; color: string }) {
  const make = useCallback(() => previewHand(text, style, pen, color), [text, style, pen, color]);
  return <AsyncImage make={make} height={34} />;
}

/** Handwriting styles, each writing your own name. Styles that lack a letter in your name are turned off. */
function HandPicker() {
  const typed = useSignatureStore((st) => st.state.fullName);
  const handStyle = useSignatureStore((st) => st.state.handStyle);
  const pen = useSignatureStore((st) => st.state.handPen);
  const colors = useSignatureStore((st) => st.state.colors);
  const gradient = useSignatureStore((st) => st.state.gradient);
  const update = useSignatureStore((st) => st.update);
  const name = useDebouncedValue(typed, 300) || 'Your Name';
  const color = activeTheme({ colors, gradient }).accent;

  const items = HAND_STYLES.map((h) => {
    const can = canHandwrite(name, h.id);
    return {
      id: h.id,
      label: h.label,
      disabled: !can,
      title: can ? `${h.label} · single-line ${h.from}` : `${h.label} does not include every letter in your name`,
      preview: <Ink text={name} style={h.id} pen={pen} color={color} />,
    };
  });
  return (
    <ControlGroup label="Handwriting">
      <PickerGrid
        label="Handwriting style"
        items={items}
        value={handStyle}
        onChange={(id) => update({ handStyle: id })}
        min={140}
        testId="hand-picker"
      />
      {handCredit ? <Note>{handCredit}</Note> : null}
      <details className="text-sm">
        <summary className="cursor-pointer">Font licences and credits</summary>
        <pre className="mt-2 max-h-60 overflow-y-auto font-sans text-xs leading-5 whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">
          {handLicense}
        </pre>
      </details>
    </ControlGroup>
  );
}

export function NamePane() {
  const state = useSignatureStore((st) => st.state);
  const update = useSignatureStore((st) => st.update);
  const fontId = useId();
  const mode = nameMode(state);
  const forced = mode === 'forced';
  const shown: NameStyle = forced ? 'hand' : state.nameStyle;
  const styles = [
    { id: 'typed', label: 'Typed font', disabled: forced, title: forced ? FORCED_TITLE : undefined },
    { id: 'hand', label: 'Handwritten' },
  ] as const satisfies readonly { id: NameStyle; label: string; disabled?: boolean; title?: string }[];

  return (
    <Pane id="name">
      <Section title="Typography" hint="every design">
        <div className="grid gap-1.5">
          <Label htmlFor={fontId}>Font for typed text</Label>
          <NativeSelect
            id={fontId}
            className="w-full"
            value={state.font}
            onChange={(e) => {
              const font = FONT_OPTIONS.find((f) => f.id === e.currentTarget.value);
              if (font) update({ font: font.id });
            }}
          >
            {FONT_OPTIONS.map((font) => (
              <NativeSelectOption key={font.id} value={font.id}>
                {font.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <ControlGroup label="Detail text size">
          <Segmented
            label="Detail text size"
            value={state.textSize}
            options={TEXT_SIZE_OPTIONS}
            onChange={(textSize) => update({ textSize })}
            testId="seg-text-size"
            wide
          />
        </ControlGroup>
        <Note>
          Standard keeps the design's sizes. Comfortable uses at least 12 px; Large uses at least 13 px. Headings stay
          larger. Fonts use local fallbacks, not downloads, so their appearance can vary by device. Handwritten names
          keep their own style.
        </Note>
        <details className="text-sm">
          <summary className="cursor-pointer">App font licences</summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Manrope and Montserrat style the editor, not your signature.
          </p>
          <pre className="mt-2 max-h-60 overflow-y-auto font-sans text-xs leading-5 whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">
            {[manropeLicense, montserratLicense].join('\n\n')}
          </pre>
        </details>
      </Section>
      <Section title="Name style" hint="every template">
        <Segmented
          label="Name style"
          value={shown}
          options={styles}
          onChange={(nameStyle) => update({ nameStyle })}
          wide
          testId="seg-name-style"
        />
        <Note live warn={mode === 'unsupported'}>
          {nameNote(state)}
        </Note>
        {shown === 'hand' && HAND_STYLES.length ? (
          <>
            <HandPicker />
            <ControlGroup label="Pen">
              <Segmented
                label="Pen"
                value={state.handPen}
                options={PENS}
                onChange={(handPen) => update({ handPen })}
                wide
                testId="seg-pen"
              />
            </ControlGroup>
            <ShowSwitch flag="flourish" label="Flourish under the name" />
          </>
        ) : null}
      </Section>
    </Pane>
  );
}
