/** A small PNG writer for the data generators. Node only, no dependencies. */
import { crc32, deflateSync } from 'node:zlib';

/** An RGB picture, 3 bytes a pixel. */
export interface Picture {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
}

/** Makes a data URL from encoded bytes. */
export const dataURL = (mime: string, bytes: Buffer): string => `data:${mime};base64,${bytes.toString('base64')}`;

function chunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Filters each row with whichever PNG filter gives the smallest sum, then deflates. */
function filtered(rows: Uint8Array[], bpp: number): Buffer {
  const out: number[] = [];
  let up: Uint8Array = new Uint8Array(rows[0]?.length ?? 0);
  for (const row of rows) {
    let best: number[] = [];
    let bestSum = Infinity;
    for (let type = 0; type < 5; type++) {
      const line = [type];
      let sum = 0;
      for (let i = 0; i < row.length; i++) {
        const a = i >= bpp ? (row[i - bpp] ?? 0) : 0;
        const b = up[i] ?? 0;
        const c = i >= bpp ? (up[i - bpp] ?? 0) : 0;
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][type] ?? 0;
        const v = ((row[i] ?? 0) - pred) & 255;
        line.push(v);
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) [best, bestSum] = [line, sum];
    }
    out.push(...best);
    up = row;
  }
  return deflateSync(Buffer.from(out), { level: 9 });
}

/** Encodes a picture as a PNG: with a palette when it has 256 colours or fewer, else as RGB. */
export function png(p: Picture): Buffer {
  const colours = new Map<number, number>();
  for (let i = 0; i < p.px.length && colours.size <= 256; i += 3) {
    const c = ((p.px[i] ?? 0) << 16) | ((p.px[i + 1] ?? 0) << 8) | (p.px[i + 2] ?? 0);
    if (!colours.has(c)) colours.set(c, colours.size);
  }
  const indexed = colours.size <= 256;
  const head = Buffer.alloc(13);
  head.writeUInt32BE(p.w, 0);
  head.writeUInt32BE(p.h, 4);
  head[8] = 8;
  head[9] = indexed ? 3 : 2;
  const rows: Uint8Array[] = [];
  for (let y = 0; y < p.h; y++) {
    const rgb = p.px.subarray(y * p.w * 3, (y + 1) * p.w * 3);
    if (!indexed) rows.push(rgb);
    else
      rows.push(
        Uint8Array.from(
          { length: p.w },
          (_, x) => colours.get(((rgb[x * 3] ?? 0) << 16) | ((rgb[x * 3 + 1] ?? 0) << 8) | (rgb[x * 3 + 2] ?? 0)) ?? 0,
        ),
      );
  }
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head)];
  if (indexed)
    parts.push(
      chunk('PLTE', Buffer.from([...colours.keys()].flatMap((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]))),
    );
  parts.push(chunk('IDAT', filtered(rows, indexed ? 1 : 3)), chunk('IEND', new Uint8Array(0)));
  return Buffer.concat(parts);
}
