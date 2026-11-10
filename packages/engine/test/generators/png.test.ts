import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { png, pngContent } from '../../scripts/lib/png.ts';

const picture = {
  w: 32,
  h: 32,
  px: Uint8Array.from({ length: 32 * 32 * 3 }, (_, i) => (i * 17) % 256),
};

function recompress(bytes: Buffer): Buffer {
  const parts = [bytes.subarray(0, 8)];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + length + 12;
    const type = bytes.toString('latin1', offset + 4, offset + 8);
    if (type === 'IDAT') {
      const data = deflateSync(inflateSync(bytes.subarray(offset + 8, end - 4)), { level: 0 });
      const body = Buffer.concat([Buffer.from(type), data]);
      const header = Buffer.alloc(4);
      header.writeUInt32BE(data.length);
      const checksum = Buffer.alloc(4);
      checksum.writeUInt32BE(crc32(body));
      parts.push(Buffer.concat([header, body, checksum]));
    } else {
      parts.push(bytes.subarray(offset, end));
    }
    offset = end;
  }
  return Buffer.concat(parts);
}

describe('generated PNG verification', () => {
  test('ignores compression differences but compares the complete decompressed content', () => {
    const original = png(picture);
    const differentCompression = recompress(original);
    expect(differentCompression.equals(original)).toBe(false);
    expect(pngContent(differentCompression)).toEqual(pngContent(original));
  });

  test('detects changed pixels', () => {
    const changed = { ...picture, px: picture.px.slice() };
    changed.px[0] = 255;
    expect(pngContent(png(changed))).not.toEqual(pngContent(png(picture)));
  });

  test('detects changed dimensions', () => {
    expect(pngContent(png({ ...picture, w: 16, h: 64 }))).not.toEqual(pngContent(png(picture)));
  });

  test('rejects damaged checksums and truncated chunks', () => {
    const bytes = png(picture);
    const damaged = Buffer.from(bytes);
    damaged[16] ^= 1;
    expect(() => pngContent(damaged)).toThrow('Invalid PNG checksum.');
    expect(() => pngContent(bytes.subarray(0, bytes.length - 1))).toThrow('Truncated PNG chunk.');
    expect(() => pngContent(Buffer.from('not a PNG'))).toThrow('Invalid PNG signature.');
  });
});
