/* The Use section: copy both versions, install them, save and open a signature file, start over, and image hosting. */
import {
  CopyIcon,
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  FolderOpenIcon,
  ReplyIcon,
  SaveIcon,
  TriangleAlertIcon,
  UserIcon,
} from 'lucide-react';
import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group.tsx';
import { useCopyActions, useCurrentSignature, useFileActions, useQueuedBuild } from '../hooks.tsx';
import { AppleMailGuide, OutlookGuide } from '../guide.tsx';
import { MoreActions } from '../preview.tsx';
import { EMAIL_PROFILE_OPTIONS } from '../engine.ts';
import type { Version } from '../engine.ts';
import { getBrowserStorageStatus, subscribeBrowserStorageStatus, useSignatureStore, useUiStore } from '../store.ts';
import { Note, Pane, Section, SwitchField } from '../ui.tsx';
import { errorText, kb, pickFile, saveYaml, YAML_FILES } from '../fields.ts';
import { brandTemplateYaml, readBrandTemplate } from '../signature-file.ts';
const ACTIONS = 'flex flex-wrap gap-2';
const HOSTING = [
  {
    id: 'embed',
    label: 'Embedded (recommended)',
  },
  {
    id: 'hosted',
    label: 'Hosted on my site',
  },
] as const;
const NEW_MESSAGE = { version: 'new' } as const;
const REPLY = { version: 'reply' } as const;

async function openBrandTemplate(): Promise<void> {
  const file = await pickFile(YAML_FILES);
  if (!file) return;
  try {
    const result = readBrandTemplate(await file.text(), useSignatureStore.getState().state);
    if (!result.ok) {
      useUiStore.getState().setFileNote(result.message);
      return;
    }
    useSignatureStore.getState().replace(result.state);
    useUiStore.getState().setFileNote(result.message);
  } catch (error) {
    useUiStore.getState().setFileNote(`The company template could not be opened: ${errorText(error)}`);
  }
}

function saveBrandTemplate(): void {
  saveYaml(brandTemplateYaml(useSignatureStore.getState().state), 'company-brand.yaml');
  useUiStore.getState().setFileNote('Saved company-brand.yaml. It contains company branding, not personal details.');
}

/** Copies one version of the signature, built on its own so it does not depend on the preview. */
function CopyVersion({ version }: { version: Version }) {
  const state = useSignatureStore((st) => st.state);
  const shown = useQueuedBuild(state, version === 'reply' ? REPLY : NEW_MESSAGE);
  const { copy, saveHtmlFile } = useCopyActions(shown);
  const reply = version === 'reply';
  const disabled = !shown.result || shown.building || Boolean(shown.error);
  return (
    <div className={ACTIONS}>
      <Button
        variant={reply ? 'outline' : 'default'}
        disabled={disabled}
        onClick={() => void copy()}
        data-testid={reply ? 'files-copy-reply' : 'files-copy-new'}
      >
        {reply ? <ReplyIcon /> : <CopyIcon />}
        {reply ? 'Copy reply signature' : 'Copy signature'}
      </Button>
      <Button variant="outline" disabled={disabled} onClick={saveHtmlFile}>
        <DownloadIcon />
        {reply ? 'Download reply HTML' : 'Download new-message HTML'}
      </Button>
    </div>
  );
}

export function FilesPane() {
  const files = useFileActions();
  const baseId = useId();
  const hostingId = useId();
  const shown = useCurrentSignature();
  const { imagesPackage } = useCopyActions(shown);
  const shownActions = useCopyActions(shown);
  const state = useSignatureStore((st) => st.state);
  const newBuild = useQueuedBuild(state, NEW_MESSAGE);
  const replyBuild = useQueuedBuild(state, REPLY);
  const newActions = useCopyActions(newBuild);
  const replyActions = useCopyActions(replyBuild);
  const storage = useSyncExternalStore(subscribeBrowserStorageStatus, getBrowserStorageStatus, getBrowserStorageStatus);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const includePhoto = useUiStore((u) => u.includePhoto);
  const setIncludePhoto = useUiStore((u) => u.setIncludePhoto);
  const setStartOver = useUiStore((u) => u.setStartOver);
  const fileNote = useUiStore((u) => u.fileNote);
  const hosting = useSignatureStore((st) => st.state.hosting);
  const setHosting = useSignatureStore((st) => st.setHosting);
  const profiles = useSignatureStore((st) => st.state.emailProfiles);
  const profileNames = EMAIL_PROFILE_OPTIONS.filter((p) => profiles.includes(p.id)).map((p) => p.label);
  const payloads = [
    { label: 'New message', built: newBuild },
    { label: 'Reply', built: replyBuild },
  ];
  useEffect(() => {
    let active = true;
    const storageManager = navigator.storage;
    if (!storageManager?.estimate) return undefined;
    void storageManager.estimate().then(
      (value) => {
        if (active && typeof value.usage === 'number' && typeof value.quota === 'number')
          setStorageEstimate({ usage: value.usage, quota: value.quota });
        return;
      },
      () => {
        if (active) setStorageEstimate(null);
        return;
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <Pane id="files">
      <Section title="Use your signature">
        <Note>Copy or download each version. Selected email profiles: {profileNames.join(', ')}.</Note>
        <CopyVersion version="new" />
        <CopyVersion version="reply" />
        <MoreActions shown={shown} />
        {profiles.includes('outlook-classic') || profiles.includes('apple-mail') ? (
          <div className="flex flex-wrap gap-2">
            {profiles.includes('outlook-classic') ? (
              <Button
                variant="outline"
                disabled={!shown.result || shown.building || Boolean(shown.error)}
                onClick={() => void shownActions.outlookPackage()}
              >
                <FileIcon />
                Download Classic Outlook package
              </Button>
            ) : null}
            {profiles.includes('apple-mail') ? (
              <>
                <Button
                  variant="outline"
                  disabled={!newBuild.result || newBuild.building || Boolean(newBuild.error)}
                  onClick={newActions.saveTextFile}
                >
                  <FileTextIcon />
                  Download new-message plain text
                </Button>
                <Button
                  variant="outline"
                  disabled={!replyBuild.result || replyBuild.building || Boolean(replyBuild.error)}
                  onClick={replyActions.saveTextFile}
                >
                  <FileTextIcon />
                  Download reply plain text
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
        {profiles.includes('outlook') || profiles.includes('outlook-classic') ? (
          <OutlookGuide modern={profiles.includes('outlook')} classic={profiles.includes('outlook-classic')} />
        ) : null}
        {profiles.includes('apple-mail') ? <AppleMailGuide /> : null}
      </Section>
      <Section title="Signature file" hint="details, images and style">
        <Note warn={storage.mode !== 'local'}>
          {storage.mode === 'local'
            ? 'Your work is saved in this browser on this device.'
            : storage.mode === 'session'
              ? 'Browser storage is limited. Your work is saved only for this tab; download a signature backup before closing it.'
              : 'Browser storage is unavailable. Your work is held in memory and will be lost when this page closes; download a signature backup now.'}
          {storageEstimate
            ? ` Browser storage: ${kb(storageEstimate.usage)} used of ${kb(storageEstimate.quota)} available.`
            : ''}
        </Note>
        <Note>
          Save everything in one file: your details, images, template and style. Open it later, on another computer or
          in another browser, to carry on where you left off. Keep it private: it holds your details.
        </Note>
        <SwitchField
          label="Include my uploaded photo"
          checked={includePhoto}
          onCheckedChange={(on) => setIncludePhoto(on)}
          data-testid="include-photo"
        />
        <div className={ACTIONS}>
          <Button onClick={files.save} data-testid="files-save-file">
            <SaveIcon />
            Save signature file
          </Button>
          <Button variant="outline" onClick={() => void files.open()} data-testid="files-open-file">
            <FolderOpenIcon />
            Open signature file
          </Button>
        </div>
        {storage.mode !== 'local' ? (
          <Button variant="outline" onClick={files.save} data-testid="files-storage-backup">
            <SaveIcon />
            Download signature backup
          </Button>
        ) : null}
        {fileNote ? (
          <Note live id="file-note">
            {fileNote}
          </Note>
        ) : null}
      </Section>
      <Section title="Company template" hint="brand only">
        <Note>
          Reuse the company name, logo and layout in another signature. This file leaves out personal details, your
          photo and awards. Opening it keeps those details in the current signature.
        </Note>
        <div className={ACTIONS}>
          <Button variant="outline" onClick={saveBrandTemplate} data-testid="files-save-brand">
            <DownloadIcon />
            Save company template
          </Button>
          <Button variant="outline" onClick={() => void openBrandTemplate()} data-testid="files-open-brand">
            <FolderOpenIcon />
            Open company template
          </Button>
        </div>
      </Section>
      <Section title="Image size" hint="estimated">
        <Note>Per-image data size before email-app processing. The Check section reports total HTML payload.</Note>
        {payloads.map(({ label, built }) => (
          <div key={label} className="text-sm">
            <p className="font-semibold">{label}</p>
            {built.result ? (
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {Object.values(built.result.images).map((image) => (
                  <li key={image.name}>
                    {image.name}: {kb(image.dataURL.length)}
                    {image.animated ? ' · animated' : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <Note>{built.building ? 'Calculating image sizes…' : 'Image size is not available.'}</Note>
            )}
          </div>
        ))}
      </Section>
      <Section title="Start over">
        <Note>
          Start blank, or try the designs with a made-up person. Both put every setting back to its default and keep
          your saved styles. Reset everything also deletes your saved styles and Studio settings.
        </Note>
        <div className={ACTIONS}>
          <Button variant="outline" onClick={() => setStartOver('blank')} data-testid="files-new-blank">
            <FileIcon />
            New blank signature
          </Button>
          <Button variant="outline" onClick={() => setStartOver('sample')} data-testid="files-random-sample">
            <UserIcon />
            Try a random sample
          </Button>
          <Button variant="destructive" onClick={() => setStartOver('reset')} data-testid="files-reset-everything">
            <TriangleAlertIcon />
            Reset everything
          </Button>
        </div>
      </Section>
      <Section title="Image hosting" hint="advanced">
        <RadioGroup
          aria-label="Image hosting"
          value={hosting.mode === 'hosted' ? 'hosted' : 'embed'}
          onValueChange={(v: unknown) =>
            setHosting({
              mode: v === 'hosted' ? 'hosted' : 'embed',
            })
          }
          data-testid="hosting"
        >
          {HOSTING.map((h) => (
            <div key={h.id} className="flex items-center gap-2">
              <RadioGroupItem value={h.id} id={`${hostingId}-${h.id}`} />
              <Label htmlFor={`${hostingId}-${h.id}`} className="font-normal">
                {h.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <div className="grid gap-1.5">
          <Label htmlFor={baseId}>Image folder URL</Label>
          <Input
            id={baseId}
            type="url"
            value={hosting.base}
            placeholder="https://example.com/signature/"
            onChange={(e) =>
              setHosting({
                base: e.currentTarget.value.trim(),
              })
            }
            data-testid="host-base"
          />
        </div>
        <div className={ACTIONS}>
          <Button
            variant="outline"
            onClick={() => void imagesPackage()}
            disabled={!shown.result}
            data-testid="download-images"
          >
            <DownloadIcon />
            Download images
          </Button>
        </div>
        <Note>
          Embedded images need no hosting, but your email app may block or remove them. Hosted images make each email
          lighter: upload the downloaded images (new and reply versions) to the folder above, then copy the signature
          again.
        </Note>
      </Section>
    </Pane>
  );
}
