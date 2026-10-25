import { deflateRawSync } from 'node:zlib';

export interface ZipEntry {
  /** Path inside the archive, with forward slashes. */
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

type Field = readonly [value: number, bytes: 2 | 4];

/** Little-endian numbers followed by raw bytes: one zip record. */
function record(fields: readonly Field[], ...tails: Uint8Array[]): Uint8Array {
  const head = fields.reduce((sum, [, bytes]) => sum + bytes, 0);
  const out = new Uint8Array(head + tails.reduce((sum, tail) => sum + tail.length, 0));
  const view = new DataView(out.buffer);
  let at = 0;
  for (const [value, bytes] of fields) {
    if (bytes === 2) view.setUint16(at, value, true);
    else view.setUint32(at, value, true);
    at += bytes;
  }
  for (const tail of tails) {
    out.set(tail, at);
    at += tail.length;
  }
  return out;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

const VERSION = 20;
const UTF8_NAMES = 0x0800;
const STORE = 0;
const DEFLATE = 8;
/** 1980-01-01 00:00, the first DOS date: the same files always give the same archive. */
const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1;

/**
 * A zip archive (PKWARE APPNOTE 6.3.10) of the entries in their order: deflated, or stored when
 * deflate does not make an entry smaller (fonts, for one).
 */
export function zip(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const path = encoder.encode(name);
    const deflated = deflateRawSync(data, { level: 9 });
    const stored = deflated.length >= data.length;
    const body = stored ? data : deflated;
    const shared: Field[] = [
      [VERSION, 2],
      [UTF8_NAMES, 2],
      [stored ? STORE : DEFLATE, 2],
      [DOS_TIME, 2],
      [DOS_DATE, 2],
      [crc32(data), 4],
      [body.length, 4],
      [data.length, 4],
      [path.length, 2],
      // No extra field.
      [0, 2],
    ];
    const local = record([[0x04034b50, 4], ...shared], path, body);
    // Made by the same version; no comment, disk 0, no attributes, then where the entry starts.
    const tail: Field[] = [
      [0, 2],
      [0, 2],
      [0, 2],
      [0, 4],
      [offset, 4],
    ];
    centrals.push(record([[0x02014b50, 4], [VERSION, 2], ...shared, ...tail], path));
    locals.push(local);
    offset += local.length;
  }
  const directory = concat(centrals);
  const end = record([
    [0x06054b50, 4],
    [0, 2],
    [0, 2],
    [entries.length, 2],
    [entries.length, 2],
    [directory.length, 4],
    [offset, 4],
    [0, 2],
  ]);
  return concat([...locals, directory, end]);
}
