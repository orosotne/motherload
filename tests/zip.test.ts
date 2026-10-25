import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { crc32, zip } from '../scripts/zip';

/** The entries as a zip reader finds them: through the local headers, one after the other. */
function readBack(archive: Uint8Array): { name: string; data: Uint8Array; method: number }[] {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const entries = [];
  let at = 0;
  while (view.getUint32(at, true) === 0x04034b50) {
    const method = view.getUint16(at + 8, true);
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const start = at + 30 + nameLength;
    const name = new TextDecoder().decode(archive.subarray(at + 30, start));
    const body = archive.subarray(start, start + size);
    entries.push({
      name,
      method,
      data: new Uint8Array(method === 8 ? inflateRawSync(body) : body),
    });
    at = start + size;
  }
  return entries;
}

describe('the zip of the web build (F6, npm run pack:web)', () => {
  it('uses the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('deflates what shrinks, stores the rest, and lists every entry at the end', () => {
    const page = new TextEncoder().encode('<canvas id="game"></canvas>'.repeat(20));
    const tiny = new Uint8Array([7, 1, 9]);
    const archive = zip([
      { name: 'index.html', data: page },
      { name: 'assets/tiny.bin', data: tiny },
    ]);
    const entries = readBack(archive);
    expect(entries.map((entry) => [entry.name, entry.method])).toEqual([
      ['index.html', 8],
      ['assets/tiny.bin', 0],
    ]);
    expect(entries[0]?.data).toEqual(page);
    expect(entries[1]?.data).toEqual(tiny);
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    const end = archive.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const directory = view.getUint32(end + 16, true);
    expect(view.getUint32(directory, true)).toBe(0x02014b50);
  });

  it('gives the same archive for the same files', () => {
    const files = [{ name: 'index.html', data: new Uint8Array([1, 2, 3, 4]) }];
    expect(zip(files)).toEqual(zip(files));
  });
});
