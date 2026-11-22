/* The Photo section: upload or drop a photo, its shape, size, look, animation, and zoom and position. */
import { cn } from 'cn';
import { ImagePlusIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import type { DragEvent } from 'react';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { Slider } from '../components/ui/slider.tsx';
import { ANIMS, LOOKS, MAX_BADGES, PHOTO_SIZES, SHAPES, badgeVerificationUrl, previewPhoto } from '../engine.ts';
import type { PhotoSettings, PhotoShape, SignatureState } from '../engine.ts';
import { LOGO_TYPES, animationNote, motionNote, photoSizeNote, readLogo } from '../fields.ts';
import { useCurrentSignature, useDebouncedValue, useNotify, usePhotoUpload } from '../hooks.tsx';
import { useSignatureStore } from '../store.ts';
import { LogoPicker } from './layout.tsx';
import {
  AsyncImage,
  ControlGroup,
  FileButton,
  Note,
  Pane,
  PickerGrid,
  Section,
  Segmented,
  ShowSwitch,
  SwitchField,
} from '../ui.tsx';
const SIZES = PHOTO_SIZES.map((z) => ({
  id: z.id,
  label: z.label,
  title: z.note,
}));
type Axis = 'zoom' | 'dx' | 'dy';
interface SliderSpec {
  key: Axis;
  label: string;
  min: number;
  max: number;
  step: number;
  /** How screen readers hear the value. */
  format: Intl.NumberFormatOptions;
}
const SLIDERS: readonly SliderSpec[] = [
  {
    key: 'zoom',
    label: 'Zoom',
    min: 1,
    max: 2,
    step: 0.01,
    format: {
      style: 'percent',
      maximumFractionDigits: 0,
    },
  },
  {
    key: 'dx',
    label: 'Left / right',
    min: -0.3,
    max: 0.3,
    step: 0.005,
    format: {
      style: 'percent',
      maximumFractionDigits: 0,
      signDisplay: 'exceptZero',
    },
  },
  {
    key: 'dy',
    label: 'Up / down',
    min: -0.3,
    max: 0.3,
    step: 0.005,
    format: {
      style: 'percent',
      maximumFractionDigits: 0,
      signDisplay: 'exceptZero',
    },
  },
];

/** The photo preview, upload, drag and drop, and the default photo. */
function PhotoSource() {
  const { result } = useCurrentSignature();
  const raw = useSignatureStore((st) => st.state.photo.src);
  const setPhoto = useSignatureStore((st) => st.setPhoto);
  const upload = usePhotoUpload();
  const [over, setOver] = useState(false);
  const src = result?.images['photo']?.dataURL ?? raw;
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    void upload(e.dataTransfer.files[0]);
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-22 shrink-0 items-center justify-center rounded-lg border bg-card">
          {src ? (
            <img
              className="max-h-20 max-w-20 object-contain"
              src={src}
              alt="You, as you appear in the signature"
              data-testid="photo-preview"
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <FileButton
              accept="image/*"
              icon={<ImagePlusIcon />}
              onFile={(f) => void upload(f)}
              testId="upload-photo"
              inputTestId="photo-file"
            >
              Upload photo
            </FileButton>
            <Button
              variant="outline"
              disabled={!raw}
              onClick={() =>
                setPhoto({
                  src: '',
                  zoom: 1,
                  dx: 0,
                  dy: 0,
                })
              }
              data-testid="default-photo"
            >
              <RotateCcwIcon />
              Use default photo
            </Button>
          </div>
          <ShowSwitch flag="photo" label="Show photo" />
        </div>
      </div>
      <div
        className={cn(
          'rounded-md border-2 border-dashed border-muted-foreground/40 p-3.5 text-center text-xs text-muted-foreground transition-colors',
          over && 'border-primary bg-primary/5',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        data-testid="photo-drop"
      >
        or drop an image here · it is cropped and sized for each template
      </div>
    </>
  );
}
function ShapeSample({ state, shape }: { state: SignatureState; shape: PhotoShape }) {
  const make = useCallback(() => previewPhoto(state, shape, 40), [state, shape]);
  if (shape === 'auto') return <span className="text-sm font-semibold text-muted-foreground">Auto</span>;
  return <AsyncImage make={make} width={40} height={40} />;
}

/** Photo shapes, each previewed with your own photo, zoom and look. */
function ShapePicker() {
  const state = useSignatureStore((st) => st.state);
  const update = useSignatureStore((st) => st.update);
  // Previews redraw once the sliders settle, not on every step.
  const look = useDebouncedValue(state, 400);
  const items = SHAPES.map((o) => ({
    id: o.id,
    label: o.label,
    preview: <ShapeSample state={look} shape={o.id} />,
  }));
  return (
    <ControlGroup label="Shape">
      <PickerGrid
        label="Photo shape"
        items={items}
        value={state.photoShape}
        onChange={(photoShape) =>
          update({
            photoShape,
          })
        }
        min={72}
        testId="shape-picker"
      />
    </ControlGroup>
  );
}
function sliderText(key: Axis, v: number): string {
  if (key === 'zoom') return `${Math.round(v * 100)}%`;
  if (v === 0) return 'centred';
  const way = key === 'dx' ? (v < 0 ? 'left' : 'right') : v < 0 ? 'up' : 'down';
  return `${Math.round(Math.abs(v) * 100)}% ${way}`;
}

/** One slider that zooms or moves the photo, with its value in words beside the label. */
function PhotoSlider({ spec }: { spec: SliderSpec }) {
  const labelId = useId();
  const value = useSignatureStore((st) => st.state.photo[spec.key]);
  const setPhoto = useSignatureStore((st) => st.setPhoto);
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label id={labelId}>{spec.label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">{sliderText(spec.key, value)}</span>
      </div>
      {/* A one-item array keeps a single thumb; the label names it through aria-labelledby. */}
      <Slider
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={[value]}
        format={spec.format}
        getAriaValueText={(_, v) => sliderText(spec.key, v)}
        aria-labelledby={labelId}
        onValueChange={(v) => {
          const next = typeof v === 'number' ? v : v[0];
          if (next !== undefined)
            setPhoto({
              [spec.key]: next,
            } satisfies Partial<PhotoSettings>);
        }}
        data-testid={`photo-${spec.key}`}
      />
    </div>
  );
}

/** Zoom and move the photo inside its shape. */
function PhotoAdjust() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-4 gap-y-3">
      {SLIDERS.map((x) => (
        <PhotoSlider key={x.key} spec={x} />
      ))}
    </div>
  );
}
function editBadge(index: number, field: 'name' | 'url', value: string) {
  const { state, update } = useSignatureStore.getState();
  const badge = state.badges[index];
  if (badge) update({ badges: state.badges.with(index, { ...badge, [field]: value }) });
}

function moveBadge(index: number, direction: -1 | 1) {
  const { state, update } = useSignatureStore.getState();
  const next = index + direction;
  if (next < 0 || next >= state.badges.length) return;
  const badges = [...state.badges];
  const [badge] = badges.splice(index, 1);
  if (badge) badges.splice(next, 0, badge);
  update({ badges });
}

function showBadge(index: number, visible: boolean) {
  const { state, update } = useSignatureStore.getState();
  const badge = state.badges[index];
  if (badge) update({ badges: state.badges.with(index, { ...badge, visible }) });
}

function Awards() {
  const badges = useSignatureStore((st) => st.state.badges);
  const notify = useNotify();
  const [uploading, setUploading] = useState(false);
  async function addBadge(file: File) {
    setUploading(true);
    try {
      const src = await readLogo(file);
      const { state, update } = useSignatureStore.getState();
      if (state.badges.length >= MAX_BADGES) {
        notify(`You can add up to ${MAX_BADGES} badges.`, 'warning');
        return;
      }
      update({ badges: [...state.badges, { src, name: file.name.replace(/\.[^.]+$/, ''), url: '', visible: true }] });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The badge could not be read.', 'warning');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Section title="Awards and certificates" hint={`${badges.length} of ${MAX_BADGES}`}>
      <Note>Badges appear in one row on new messages. Use an image and add a verification link if you have one.</Note>
      {badges.map((badge, i) => {
        const number = i + 1;
        const invalid = Boolean(badge.url.trim() && !badgeVerificationUrl(badge.url));
        return (
          <div
            key={`badge-${number}`}
            className="flex items-start gap-3 rounded-md border p-3"
            data-badge={number}
            data-testid={`badge-${number}`}
          >
            <img src={badge.src} alt="" className="size-12 shrink-0 rounded-sm bg-card object-contain" />
            <div className="grid min-w-0 flex-1 gap-2">
              <Input
                aria-label={`Badge ${number} name`}
                placeholder="Badge name"
                maxLength={120}
                value={badge.name}
                onChange={(e) => editBadge(i, 'name', e.currentTarget.value)}
              />
              <Input
                aria-label={`Badge ${number} verification link`}
                aria-invalid={invalid || undefined}
                placeholder="Verification link (optional)"
                maxLength={2048}
                value={badge.url}
                onChange={(e) => editBadge(i, 'url', e.currentTarget.value)}
              />
              {invalid ? <Note warn>Enter a valid web address. The badge won’t link until it’s valid.</Note> : null}
              <SwitchField
                label={`Show badge ${number}`}
                checked={badge.visible}
                onCheckedChange={(visible) => showBadge(i, visible)}
              />
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={i === 0} onClick={() => moveBadge(i, -1)}>
                  Move up
                </Button>
                <Button variant="outline" size="sm" disabled={i === badges.length - 1} onClick={() => moveBadge(i, 1)}>
                  Move down
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove badge ${number}`}
              onClick={() => {
                const { state, update } = useSignatureStore.getState();
                update({ badges: state.badges.filter((_, idx) => idx !== i) });
              }}
            >
              <Trash2Icon />
            </Button>
          </div>
        );
      })}
      {badges.length < MAX_BADGES && !uploading ? (
        <div>
          <FileButton
            accept={LOGO_TYPES.join(',')}
            icon={<ImagePlusIcon />}
            onFile={(file) => void addBadge(file)}
            inputTestId="badge-file"
          >
            Add award or certificate
          </FileButton>
        </div>
      ) : null}
      {uploading ? <Note live>Reading the badge…</Note> : null}
    </Section>
  );
}

export function PhotoPane() {
  const state = useSignatureStore((st) => st.state);
  const update = useSignatureStore((st) => st.update);
  const logoIsMain = state.featuredImage === 'logo' && Boolean(state.logo.src);
  return (
    <Pane id="photo">
      <Section
        title="Main image"
        hint={logoIsMain ? 'Company logo' : state.photo.src ? 'Uploaded photo' : 'Default photo'}
      >
        {logoIsMain ? (
          <>
            <Note>Your company logo fits without cropping or photo effects.</Note>
            <ShowSwitch flag="photo" label="Show main image" />
          </>
        ) : (
          <>
            <PhotoSource />
            <ShapePicker />
          </>
        )}
        <ControlGroup label="Size" note={photoSizeNote(state)}>
          <Segmented
            label="Photo size"
            value={state.photoSize}
            options={SIZES.map(({ id, label, title }) => ({
              id,
              label,
              title,
              disabled: state.template === 'minimal',
            }))}
            onChange={(photoSize) =>
              update({
                photoSize,
              })
            }
            wide
            testId="seg-photo-size"
          />
        </ControlGroup>
        {!logoIsMain ? (
          <>
            <ControlGroup label="Look">
              <Segmented
                label="Photo look"
                value={state.photoLook}
                options={LOOKS}
                onChange={(photoLook) =>
                  update({
                    photoLook,
                  })
                }
                wide
                testId="seg-look"
              />
            </ControlGroup>
            <ControlGroup label="Animation" note={animationNote(state)}>
              <Segmented
                label="Photo animation"
                value={state.photoAnim}
                options={ANIMS}
                onChange={(photoAnim) =>
                  update({
                    photoAnim,
                  })
                }
                testId="seg-anim"
              />
            </ControlGroup>
            <PhotoAdjust />
          </>
        ) : null}
        <div className="flex flex-col gap-2.5">
          <ShowSwitch flag="animate" label="Animations (photo, shimmer, sparkle, mesh, handwriting)" />
          <SwitchField
            label="Keep animations looping"
            checked={state.motion === 'loop'}
            onCheckedChange={(on) =>
              update({
                motion: on ? 'loop' : 'brief',
              })
            }
            data-testid="loop-toggle"
          />
          <Note live>{motionNote(state)}</Note>
        </div>
      </Section>
      <Section title="Company logo">
        <LogoPicker />
      </Section>
      <Awards />
    </Pane>
  );
}
