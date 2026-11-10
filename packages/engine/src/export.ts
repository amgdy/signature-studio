import { dataUrlBytes } from './build.ts';
import { esc } from './html.ts';
import { crc32 } from './png.ts';
import type { BuildResult, HostingMode } from './types.ts';

/** How the signature was copied: through the clipboard API, or by selecting it on the page. */
export type CopyMethod = 'clipboard' | 'selection';

/** Copies the signature as rich HTML with a plain-text version. Falls back to selecting it on the page and copying that. */
export function copyRich(html: string, text: string): Promise<CopyMethod> {
  const fallback = (): CopyMethod => {
    const host = document.createElement('div');
    host.setAttribute('contenteditable', 'true');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;opacity:0;pointer-events:none;';
    host.innerHTML = html;
    document.body.appendChild(host);
    const r = document.createRange();
    r.selectNodeContents(host);
    const sel = window.getSelection();
    /* there is no selection only without a browsing context; copying fails there as it did before */
    if (!sel) throw new TypeError('No selection to copy from');
    sel.removeAllRanges();
    sel.addRange(r);
    const els = [document.documentElement, document.body];
    const kept = els.map((el): [value: string, priority: string] => [
      el.style.getPropertyValue('background-color'),
      el.style.getPropertyPriority('background-color'),
    ]);
    els.forEach((el) => {
      el.style.setProperty('background-color', 'transparent', 'important');
    });
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    els.forEach((el, i) => {
      if (kept[i][0]) el.style.setProperty('background-color', kept[i][0], kept[i][1]);
      else el.style.removeProperty('background-color');
    });
    sel.removeAllRanges();
    host.remove();
    if (!ok) throw new Error('Copy was blocked by the browser');
    return 'selection';
  };
  try {
    if (navigator.clipboard && window.ClipboardItem && window.isSecureContext) {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      });
      return navigator.clipboard.write([item]).then(
        (): CopyMethod => 'clipboard',
        () => fallback(),
      );
    }
  } catch {
    /* use fallback */
  }
  return Promise.resolve().then(fallback);
}

/* copies text through a hidden text box, for browsers without the clipboard API */
function legacyText(text: string): void {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-10000px;top:0;';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  if (!ok) throw new Error('Copy was blocked by the browser');
}

/** Copies plain text. */
export function copyText(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText)
    return navigator.clipboard.writeText(text).catch(() => legacyText(text));
  return Promise.resolve().then(() => legacyText(text));
}

/** A file to put in a zip archive. Text is stored as UTF-8. */
interface ZipFile {
  name: string;
  data: string | Uint8Array<ArrayBuffer>;
}

/** A zip archive of the files, stored without compression. */
function zip(files: readonly ZipFile[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  const central: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  files.forEach((fl) => {
    const name = enc.encode(fl.name);
    const data = typeof fl.data === 'string' ? enc.encode(fl.data) : fl.data;
    const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true);
    lh.setUint16(12, date, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true);
    lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true);
    lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true);
    ch.setUint16(14, date, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true);
    ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true);
    ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + data.length;
  });
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

/** A file ready to download. */
export interface ExportPackage {
  blob: Blob;
  filename: string;
}

/** One signature or several. */
export type ResultList = BuildResult | readonly BuildResult[];

/* a file name without characters Windows or macOS refuse */
function safeName(v: string): string {
  return (
    v
      .replace(/[\\/:*?"<>|]+/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Signature'
  );
}

/* Array.isArray does not narrow a readonly array type, hence the guard */
function isList(list: ResultList): list is readonly BuildResult[] {
  return Array.isArray(list);
}

function listOf(list: ResultList): readonly BuildResult[] {
  return isList(list) ? list : [list];
}

/** A complete HTML page around the signature. */
function htmlDoc(body: string, title: string): string {
  return `<!DOCTYPE html>\n<html lang="en"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>\n<body style="margin:0;padding:16px;">\n${body}\n</body></html>`;
}

/** A file name for a signature: the person's name, the design and, for replies, "(Reply)". */
function sigName(res: Pick<BuildResult, 'state' | 'template' | 'version'>): string {
  return safeName(`${res.state.fullName} - ${res.template.name}${res.version === 'reply' ? ' (Reply)' : ''}`);
}

/** A zip for classic Outlook: each signature as an .htm file with its images in a folder beside it, plus a .txt file. */
export function outlookPackage(list: ResultList): ExportPackage {
  const all = listOf(list);
  const files: ZipFile[] = [];
  all.forEach((res) => {
    const nm = sigName(res);
    const folder = `${nm}_files`;
    files.push(
      { name: `${nm}.htm`, data: htmlDoc(res.html('folder', folder), nm) },
      { name: `${nm}.txt`, data: `${res.text}\r\n` },
    );
    for (const im of Object.values(res.images)) {
      files.push({ name: `${folder}/${im.file}`, data: dataUrlBytes(im.dataURL) });
    }
  });
  return {
    blob: zip(files),
    filename: `${safeName(`${all[0].state.fullName} - ${all[0].template.name}`)} (classic Outlook).zip`,
  };
}

/** A zip of every image of the signatures, each file once. */
export function imagesPackage(list: ResultList): ExportPackage {
  const all = listOf(list);
  const files: ZipFile[] = [];
  const seen: Record<string, 1> = {};
  all.forEach((res) => {
    for (const im of Object.values(res.images)) {
      if (!seen[im.file]) {
        seen[im.file] = 1;
        files.push({ name: im.file, data: dataUrlBytes(im.dataURL) });
      }
    }
  });
  return {
    blob: zip(files),
    filename: `${safeName(`${all[0].state.fullName} - ${all[0].template.name}`)} images.zip`,
  };
}

/** Saves a file through the browser's download. */
export function download(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  const u = URL.createObjectURL(blob);
  a.href = u;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(u);
  }, 4000);
}

/** Saves the signature as an HTML page, with images embedded, hosted at `base` or in folder `base`. */
export function downloadHtml(
  res: Pick<BuildResult, 'state' | 'template' | 'version' | 'html'>,
  mode?: HostingMode,
  base?: string,
): void {
  const nm = sigName(res);
  download(new Blob([htmlDoc(res.html(mode, base), nm)], { type: 'text/html' }), `${nm}.html`);
}
