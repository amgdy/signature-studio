/* The Layout section: columns, photo position, icons, colour theme, background and the company logo. */
import { cn } from 'cn';
import { ImageIcon, PlusIcon, Trash2Icon, UploadIcon, XIcon } from 'lucide-react';
import { useCallback, useId, useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion.tsx';
import { Button } from '../components/ui/button.tsx';
import { Label } from '../components/ui/label.tsx';
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select.tsx';
import { RadioGroup } from '../components/ui/radio-group.tsx';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select.tsx';
import {
  BACKGROUNDS,
  CARD_GROUPS,
  ICON_COLORS,
  ICON_FAMILIES,
  ICON_STYLES,
  ICON_WEIGHTS,
  MAX_COLORS,
  PALETTE_GROUPS,
  THEME_LIST,
  activeTheme,
  bgTint,
  logoColors,
  previewIcon,
  themeSettings,
} from '../engine.ts';
import type { BackgroundMode, ColumnsSetting, IconPreviewOptions, IconStyle, PhotoPosition } from '../engine.ts';
import {
  LOGO_TYPES,
  backgroundHex,
  backgroundNote,
  columnsNote,
  colorsNote,
  iconColorNote,
  iconNote,
  iconWeightNote,
  photoPositionNote,
  themeHint,
} from '../fields.ts';
import { useAsyncValue, useColourImage, useLogoUpload } from '../hooks.tsx';
import { useSignatureStore } from '../store.ts';
import {
  AsyncImage,
  ColourPicker,
  ControlGroup,
  FileButton,
  Group,
  Note,
  Pane,
  PickerGrid,
  Section,
  Segmented,
  ShowSwitch,
  Swatch,
  SwitchField,
} from '../ui.tsx';
import type { ColourGroup } from '../ui.tsx';
type ColumnsId = 'auto' | '1' | '2' | '3';
const COLUMNS = [
  {
    id: 'auto',
    label: 'Auto',
  },
  {
    id: '1',
    label: '1 column',
  },
  {
    id: '2',
    label: '2 columns',
  },
  {
    id: '3',
    label: '3 columns',
  },
] as const satisfies readonly {
  id: ColumnsId;
  label: string;
}[];
const POSITIONS = [
  {
    id: 'column',
    label: 'Own column',
  },
  {
    id: 'name',
    label: 'Beside name',
  },
] as const satisfies readonly {
  id: PhotoPosition;
  label: string;
}[];
const BG_MODES = [
  {
    id: 'transparent',
    label: 'Transparent',
  },
  {
    id: 'solid',
    label: 'Solid colour',
  },
] as const satisfies readonly {
  id: BackgroundMode;
  label: string;
}[];
const ICON_KINDS = ['phone', 'mail', 'web'] as const;
const ICON_GROUPS = [
  {
    id: 'simple',
    label: 'Simple',
    styles: ['auto', 'labels', 'glyph', 'outline', 'gradient', 'brand'],
  },
  {
    id: 'frames',
    label: 'Outlined frames',
    styles: ['ring', 'square'],
  },
  {
    id: 'soft',
    label: 'Soft backgrounds',
    styles: ['fluent', 'soft', 'glass'],
  },
  {
    id: 'filled',
    label: 'Filled shapes',
    styles: ['circle', 'tile', 'rounded', 'squircle'],
  },
  {
    id: 'effects',
    label: 'Raised & stickers',
    styles: ['sticker', 'depth'],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  styles: readonly IconStyle[];
}[];
/** Sample icons in the picker are drawn at the size the signatures use. */
const SAMPLE = 18;
const THEME_GROUPS = PALETTE_GROUPS.map((group) => ({
  group,
  themes: THEME_LIST.filter((t) => t.group === group.id),
})).filter((g) => g.themes.length);
/** One-click colours for your own palette: light, main and deep shades of eight hues, then neutrals. */
const SUGGESTED: ColourGroup = {
  label: 'Suggested',
  colors: [
    {
      name: 'Light red',
      hex: '#EF6950',
    },
    {
      name: 'Light orange',
      hex: '#FF8C00',
    },
    {
      name: 'Yellow',
      hex: '#FFD400',
    },
    {
      name: 'Lime',
      hex: '#8CBD18',
    },
    {
      name: 'Mint',
      hex: '#00B294',
    },
    {
      name: 'Sky',
      hex: '#3AA0F3',
    },
    {
      name: 'Lavender',
      hex: '#A79CF1',
    },
    {
      name: 'Light pink',
      hex: '#EE5FB7',
    },
    {
      name: 'Red',
      hex: '#D13438',
    },
    {
      name: 'Orange',
      hex: '#F7630C',
    },
    {
      name: 'Gold',
      hex: '#EAA300',
    },
    {
      name: 'Green',
      hex: '#107C10',
    },
    {
      name: 'Teal',
      hex: '#038387',
    },
    {
      name: 'Blue',
      hex: '#0078D4',
    },
    {
      name: 'Purple',
      hex: '#8764B8',
    },
    {
      name: 'Pink',
      hex: '#E43BA6',
    },
    {
      name: 'Dark red',
      hex: '#A4262C',
    },
    {
      name: 'Burnt orange',
      hex: '#CA5010',
    },
    {
      name: 'Bronze',
      hex: '#986F0B',
    },
    {
      name: 'Dark green',
      hex: '#0B6A0B',
    },
    {
      name: 'Dark teal',
      hex: '#005B70',
    },
    {
      name: 'Navy',
      hex: '#004E8C',
    },
    {
      name: 'Grape',
      hex: '#5C2E91',
    },
    {
      name: 'Plum',
      hex: '#881798',
    },
    {
      name: 'Black',
      hex: '#000000',
    },
    {
      name: 'Charcoal',
      hex: '#242424',
    },
    {
      name: 'Graphite',
      hex: '#3D3D3D',
    },
    {
      name: 'Slate',
      hex: '#475467',
    },
    {
      name: 'Steel',
      hex: '#69797E',
    },
    {
      name: 'Stone',
      hex: '#7A7574',
    },
    {
      name: 'Silver',
      hex: '#A19F9D',
    },
    {
      name: 'Platinum',
      hex: '#D2D0CE',
    },
  ],
};
const columnsId = (c: ColumnsSetting): ColumnsId => (c === 'auto' ? 'auto' : c === 1 ? '1' : c === 2 ? '2' : '3');
const toColumns = (id: ColumnsId): ColumnsSetting => (id === 'auto' ? 'auto' : id === '1' ? 1 : id === '2' ? 2 : 3);
function paletteFill(colors: readonly string[], gradient = true): string {
  return gradient && colors.length > 1 ? `linear-gradient(90deg,${colors.join(',')})` : colors[0];
}

/** A small bar of a palette's colours beside its name. */
function ThemeSwatch({ fill }: { fill: string }) {
  return (
    <span
      className="h-4 w-9 shrink-0 rounded-sm shadow-[inset_0_0_0_1px_var(--border)]"
      style={{
        background: fill,
      }}
      aria-hidden="true"
    />
  );
}
function Glyph({ style, kind, opts }: { style: IconStyle; kind: string; opts: IconPreviewOptions }) {
  const make = useCallback(() => previewIcon(style, kind, opts), [style, kind, opts]);
  return <AsyncImage make={make} width={SAMPLE} height={SAMPLE} />;
}

/** Three sample icons on a light row and a dark row, as they show in light and dark mode. */
function IconSample({
  iconStyle,
  light,
  dark,
}: {
  iconStyle: IconStyle;
  light: IconPreviewOptions;
  dark: IconPreviewOptions;
}) {
  if (iconStyle === 'auto') return <span className="text-sm font-semibold text-muted-foreground">Aa</span>;
  if (iconStyle === 'labels') return <span className="text-sm font-semibold text-muted-foreground">Mobile</span>;
  return (
    <span className="flex flex-col gap-0.75">
      {[light, dark].map((opts) => (
        <span
          key={opts.dark ? 'dark' : 'light'}
          // The rows show the mail backgrounds of light and dark mode, whatever the Studio theme.
          className={cn(
            'flex gap-1 rounded-md px-1.25 py-0.75',
            opts.dark ? 'bg-[#1F1F1F] shadow-[inset_0_0_0_1px_#3D3D3D]' : 'bg-white shadow-[inset_0_0_0_1px_#E0E0E0]',
          )}
        >
          {ICON_KINDS.map((k) => (
            <Glyph key={k} style={iconStyle} kind={k} opts={opts} />
          ))}
        </span>
      ))}
    </span>
  );
}

/** Icon styles, each with sample icons in your colours, then the weight and colour for any style. */
function IconPicker() {
  const state = useSignatureStore((st) => st.state);
  const update = useSignatureStore((st) => st.update);
  const { colors, gradient, iconFamily, iconWeight, iconColor } = state;
  const [filter, setFilter] = useState<string | null>(null);
  const groupId = useId();
  const group = filter ?? ICON_GROUPS.find((g) => g.styles.some((id) => id === state.iconStyle))?.id ?? 'simple';
  const selectedGroup = ICON_GROUPS.find((g) => g.id === group);
  const light = useMemo<IconPreviewOptions>(
    () => ({
      colors,
      gradient,
      family: iconFamily,
      weight: iconWeight,
      color: iconColor,
      size: SAMPLE,
    }),
    [colors, gradient, iconFamily, iconWeight, iconColor],
  );
  const dark = useMemo<IconPreviewOptions>(
    () => ({
      ...light,
      dark: true,
    }),
    [light],
  );
  const noIcons = state.iconStyle === 'labels';
  const items = ICON_STYLES.filter((o) => !selectedGroup || selectedGroup.styles.some((id) => id === o.id)).map(
    (o) => ({
      id: o.id,
      label: o.label,
      title: o.note,
      preview: <IconSample iconStyle={o.id} light={light} dark={dark} />,
    }),
  );
  return (
    <>
      <ControlGroup
        label="Drawing family"
        note="Changes contact and blog drawings. Familiar brand marks keep their shape."
      >
        <PickerGrid
          label="Icon family"
          items={ICON_FAMILIES.map((f) => ({
            id: f.id,
            label: f.label,
            title: f.note,
            preview: (
              <IconSample
                iconStyle="glyph"
                light={{
                  ...light,
                  family: f.id,
                }}
                dark={{
                  ...dark,
                  family: f.id,
                }}
              />
            ),
          }))}
          value={iconFamily}
          onChange={(v) =>
            update({
              iconFamily: v,
            })
          }
          min={120}
          testId="icon-family-picker"
        />
      </ControlGroup>
      <div className="grid gap-1.5">
        <Label htmlFor={groupId}>Style group</Label>
        <NativeSelect id={groupId} className="w-full" value={group} onChange={(e) => setFilter(e.currentTarget.value)}>
          <NativeSelectOption value="all">All styles</NativeSelectOption>
          {ICON_GROUPS.map((g) => (
            <NativeSelectOption key={g.id} value={g.id}>
              {g.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <ControlGroup label="Icon style" note={iconNote(state)}>
        <PickerGrid
          label="Icon style"
          items={items}
          value={state.iconStyle}
          onChange={(v) =>
            update({
              iconStyle: v,
            })
          }
          min={92}
          testId="icon-picker"
        />
      </ControlGroup>
      <ControlGroup label="Icon weight" note={iconWeightNote(state)}>
        <Segmented
          label="Icon weight"
          value={iconWeight}
          options={ICON_WEIGHTS.map((o) => ({
            id: o.id,
            label: o.label,
            title: o.note,
            disabled: noIcons,
          }))}
          onChange={(v) =>
            update({
              iconWeight: v,
            })
          }
          wide
          testId="seg-icon-weight"
        />
      </ControlGroup>
      <ControlGroup label="Icon colour" note={iconColorNote(state)}>
        <Segmented
          label="Icon colour"
          value={iconColor}
          options={ICON_COLORS.map((o) => ({
            id: o.id,
            label: o.label,
            title: o.note,
            disabled: noIcons,
          }))}
          onChange={(v) =>
            update({
              iconColor: v,
            })
          }
          wide
          testId="seg-icon-color"
        />
      </ControlGroup>
    </>
  );
}

/** The same editable colour settings for presets and custom palettes. */
function ColourSettings({
  suggestions,
  source,
  onImage,
}: {
  suggestions: readonly string[][];
  source: 'logo' | 'image' | null;
  onImage: (src: string) => void;
}) {
  const colors = useSignatureStore((st) => st.state.colors);
  const gradient = useSignatureStore((st) => st.state.gradient);
  const update = useSignatureStore((st) => st.update);
  const read = useColourImage(onImage);
  const set = (next: readonly string[]) =>
    update({
      colors: [...next],
    });
  const next = (): string => SUGGESTED.colors.find((c) => !colors.includes(c.hex))?.hex ?? '#0F6CBD';
  const logoGroup: ColourGroup = {
    label: source === 'image' ? 'From your image' : 'From your logo',
    colors: (suggestions.at(-1) ?? []).map((hex, i) => ({
      name: `${source === 'image' ? 'Image' : 'Logo'} colour ${i + 1}`,
      hex,
    })),
  };
  return (
    <div className="flex flex-col gap-2" data-testid="color-settings">
      <div className="flex flex-wrap items-center gap-3">
        {colors.map((color, i) => (
          // oxlint-disable-next-line react/no-array-index-key -- fixed colour slots keep picker focus while a colour changes
          <span key={i} className="inline-flex items-center">
            <ColourPicker
              value={color}
              onChange={(v) => set(colors.map((c, j) => (j === i ? v : c)))}
              label={`Colour ${i + 1}`}
              groups={[logoGroup, SUGGESTED]}
              big
              testId={`color-${i + 1}`}
            />
            {colors.length > 1 ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove colour ${i + 1}`}
                onClick={() => set(colors.filter((_, j) => j !== i))}
              >
                <XIcon />
              </Button>
            ) : null}
          </span>
        ))}
        {colors.length < MAX_COLORS ? (
          <Button variant="outline" size="sm" onClick={() => set([...colors, next()])} data-testid="color-add">
            <PlusIcon />
            Add colour
          </Button>
        ) : null}
      </div>
      <SwitchField
        label="Gradient"
        checked={gradient}
        disabled={colors.length < 2}
        onCheckedChange={(checked) =>
          update({
            gradient: checked,
          })
        }
      />
      <Note>
        {colors.length < 2
          ? 'Add another colour to use a gradient.'
          : gradient
            ? 'Text shades adjust automatically for readability.'
            : 'Solid uses the first colour. Your other colours are kept.'}
      </Note>
      <Accordion>
        <AccordionItem value="image">
          <AccordionTrigger className="py-1.5">Colours from a logo or image</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 pt-1 [&_p:not(:last-child)]:mb-0">
            {source && suggestions.length ? (
              <div className="flex flex-wrap items-center gap-3" data-testid="logo-colors">
                {suggestions.map((cs) => (
                  <Button
                    key={cs.join()}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      update({
                        colors: [...cs],
                        gradient: cs.length > 1,
                      })
                    }
                    data-testid={`logo-colors-${cs.length}`}
                  >
                    <span
                      className="h-3.5 w-7 shrink-0 rounded-full"
                      style={{
                        background: paletteFill(cs),
                      }}
                      aria-hidden="true"
                    />
                    {cs.length === 1 ? 'Main colour' : `${cs.length} colours`}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <FileButton
                accept={LOGO_TYPES.join(',')}
                icon={<ImageIcon />}
                size="sm"
                onFile={(f) => void read(f)}
                inputTestId="colors-file"
                testId="colors-from-image"
              >
                {source ? 'Use another image' : 'Find colours in an image'}
              </FileButton>
            </div>
            <Note live>
              {source && !suggestions.length
                ? 'No clear colours found in this image. Pick your colours above.'
                : source === 'logo'
                  ? 'Colours found in your company logo.'
                  : source === 'image'
                    ? 'Colours found in the image you picked. The image is not added to your signature.'
                    : 'Upload a company logo, or pick any image, to find its main colours. The image is not added to your signature.'}
            </Note>
            <Note live>{colorsNote(colors)}</Note>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/** Presets prefill the controls below; the current settings determine the selected name. */
function ThemePicker() {
  const colors = useSignatureStore((st) => st.state.colors);
  const gradient = useSignatureStore((st) => st.state.gradient);
  const logo = useSignatureStore((st) => st.state.logo.src);
  const update = useSignatureStore((st) => st.update);
  const [picked, setPicked] = useState({
    src: '',
    logo,
  });
  // A logo uploaded after the image was picked takes over the suggestions.
  const image = picked.logo === logo ? picked.src : '';
  const src = image || logo;
  const find = useCallback(() => (src ? logoColors(src) : Promise.resolve([])), [src]);
  const suggestions = useAsyncValue(find) ?? [];
  const selected = activeTheme({
    colors,
    gradient,
  });
  return (
    <ControlGroup label="Colour theme">
      <Select
        value={selected.id === 'custom' ? null : selected.id}
        onValueChange={(value) => {
          const theme = THEME_LIST.find((t) => t.id === value);
          if (theme) update(themeSettings(theme.id));
        }}
      >
        <SelectTrigger aria-label="Colour theme" className="w-full min-w-0" data-testid="theme-picker">
          <SelectValue className="min-w-0">
            <ThemeSwatch fill={paletteFill(colors, gradient)} />
            {selected.name}
          </SelectValue>
        </SelectTrigger>
        {/* The list opens below the trigger and scrolls inside a short popup. */}
        <SelectContent
          alignItemWithTrigger={false}
          align="start"
          className="flex max-h-[min(320px,50vh,var(--available-height))] flex-col overflow-hidden [&>[role=listbox]]:min-h-0 [&>[role=listbox]]:overflow-y-auto [&>[role=listbox]]:overscroll-contain"
        >
          {THEME_GROUPS.map((g) => (
            <SelectGroup key={g.group.id}>
              <SelectLabel>{g.group.label}</SelectLabel>
              {g.themes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <ThemeSwatch fill={paletteFill(t.colors, t.gradient)} />
                  {t.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <ColourSettings
        suggestions={suggestions}
        source={image ? 'image' : logo ? 'logo' : null}
        onImage={(img) =>
          setPicked({
            src: img,
            logo,
          })
        }
      />
    </ControlGroup>
  );
}

/** No background, or a solid card colour with a contrast warning. */
function BackgroundPicker() {
  const state = useSignatureStore((st) => st.state);
  const update = useSignatureStore((st) => st.update);
  const solid = state.bgMode === 'solid';
  const preset = BACKGROUNDS.some((b) => b.id === state.bgColor);
  const hex = backgroundHex(state);
  const note = backgroundNote(state);
  const pick = (bgColor: string) =>
    update({
      bgMode: 'solid',
      bgColor,
    });
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Background</span>
      <Segmented
        label="Background"
        value={state.bgMode}
        options={BG_MODES}
        onChange={(bgMode) =>
          update({
            bgMode,
          })
        }
        wide
        testId="seg-bg"
      />
      {solid ? (
        <div className="flex flex-col items-start gap-1.5" data-testid="bg-picker">
          <RadioGroup
            aria-label="Background colour"
            value={state.bgColor}
            onValueChange={(value) => {
              const bg = BACKGROUNDS.find((b) => b.id === value);
              if (bg) pick(bg.id);
            }}
            className="gap-1.5"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
            }}
          >
            {BACKGROUNDS.map((b) => (
              <Swatch
                key={b.id}
                value={b.id}
                fill={b.id === 'tint' ? bgTint(state) : b.id}
                label={b.label}
                title={b.id === 'tint' ? 'A light tint of the colour theme' : `${b.label} ${b.id}`}
              />
            ))}
          </RadioGroup>
          <ColourPicker
            value={hex}
            onChange={pick}
            label="Custom background colour"
            groups={CARD_GROUPS}
            className={cn(
              'border border-dashed py-1 pr-2.5 pl-1 text-xs transition-colors hover:border-ring hover:bg-muted/60',
              !preset &&
                'border-solid border-primary bg-primary/5 font-semibold ring-1 ring-primary dark:bg-primary/15',
            )}
            testId="bg-custom"
          >
            Custom
          </ColourPicker>
        </div>
      ) : null}
      <Note live warn={solid && note.warn}>
        {note.text}
      </Note>
    </div>
  );
}

// A light checkerboard shows which parts of the logo are transparent.
const CHECKERBOARD = {
  backgroundColor: '#FFFFFF',
  backgroundImage:
    'linear-gradient(45deg,#EEE 25%,transparent 25%,transparent 75%,#EEE 75%),linear-gradient(45deg,#EEE 25%,transparent 25%,transparent 75%,#EEE 75%)',
  backgroundSize: '10px 10px',
  backgroundPosition: '0 0,5px 5px',
  color: '#616161',
};

/** The company logo: a show switch, an upload button, a preview and a remove button. */
export function LogoPicker() {
  const src = useSignatureStore((st) => st.state.logo.src);
  const shown = useSignatureStore((st) => st.state.show.logo);
  const setLogo = useSignatureStore((st) => st.setLogo);
  const upload = useLogoUpload();
  return (
    <Group label="Company logo" className="flex flex-col gap-2" testId="logo-group">
      <span className="text-sm font-medium">Company logo</span>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="flex size-14 items-center justify-center rounded-md border border-dashed text-[10px]"
          style={CHECKERBOARD}
          data-testid="logo-frame"
        >
          {src ? (
            <img
              className="max-h-12 max-w-12 object-contain"
              src={src}
              alt="Your company logo"
              data-testid="logo-preview"
            />
          ) : (
            'No logo'
          )}
        </span>
        <FileButton
          accept={LOGO_TYPES.join(',')}
          icon={<UploadIcon />}
          onFile={(f) => void upload(f)}
          inputTestId="logo-file"
          testId="upload-logo"
        >
          {src ? 'Change logo' : 'Upload logo'}
        </FileButton>
        {src ? (
          <Button variant="ghost" onClick={() => setLogo('')} data-testid="remove-logo">
            <Trash2Icon />
            Remove logo
          </Button>
        ) : null}
      </div>
      <ShowSwitch flag="logo" label="Show logo" />
      <Note live>
        {shown && !src
          ? 'No logo uploaded yet, so none shows. Upload a square logo mark. Your company name shows beside it.'
          : 'Upload a square logo mark. Your company name shows beside it. PNG, JPEG, GIF or WebP; it is scaled to fit 128 × 128.'}
      </Note>
    </Group>
  );
}
export function LayoutPane() {
  const state = useSignatureStore((st) => st.state);
  const update = useSignatureStore((st) => st.update);
  return (
    <Pane id="layout">
      <Section title="Layout and colours" hint={themeHint(state)}>
        <ControlGroup label="Columns beside the photo" note={columnsNote(state)}>
          <Segmented
            label="Columns"
            value={columnsId(state.cols)}
            options={COLUMNS}
            onChange={(id) =>
              update({
                cols: toColumns(id),
              })
            }
            wide
            testId="seg-columns"
          />
        </ControlGroup>
        <ControlGroup label="Photo in 2 or 3 columns" note={photoPositionNote(state)}>
          <Segmented
            label="Photo in two or three columns"
            value={state.photoPos}
            options={POSITIONS}
            onChange={(photoPos) =>
              update({
                photoPos,
              })
            }
            wide
            testId="seg-photo-pos"
          />
        </ControlGroup>
        <ThemePicker />
        <BackgroundPicker />
        <ShowSwitch flag="stack" label="Contacts one per line" />
      </Section>
    </Pane>
  );
}
export function IconsPane() {
  return (
    <Pane id="icons">
      <Section title="Signature icons">
        <IconPicker />
      </Section>
    </Pane>
  );
}
