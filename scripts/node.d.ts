/**
 * The few Node APIs the release scripts use, typed by hand: the project has no @types/node and
 * takes no dependency it does not need (GAME_SPEC §11.6).
 */
declare module 'node:fs' {
  export interface DirEntry {
    name: string;
    isDirectory(): boolean;
  }
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options: { recursive: true }): void;
  export function readdirSync(path: string, options: { withFileTypes: true }): DirEntry[];
  export function readFileSync(path: string): Uint8Array;
  export function writeFileSync(path: string, data: Uint8Array): void;
}

declare module 'node:zlib' {
  export function deflateRawSync(data: Uint8Array, options?: { level?: number }): Uint8Array;
  export function inflateRawSync(data: Uint8Array): Uint8Array;
}
