import type { Speaker } from '../data/story';

/**
 * Radio portraits (GAME_SPEC §7): round toy-like faces, 64 × 64, filled flat like the rest of
 * the UI. Static markup only: these strings go into innerHTML.
 */
const face = (background: string, parts: string): string =>
  `<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">` +
  `<circle cx="32" cy="32" r="32" fill="${background}"/>${parts}</svg>`;

export const PORTRAITS: Readonly<Record<Speaker, string>> = {
  // Gus: an old mechanic with a flat cap and a big grey moustache.
  gus: face(
    '#F2CC8F',
    '<path d="M14 64c2-12 9-17 18-17s16 5 18 17z" fill="#5B6C8F"/>' +
      '<circle cx="32" cy="34" r="15" fill="#F0C4A0"/>' +
      '<path d="M15 27c1-9 8-13 17-13s16 4 17 13z" fill="#3D4A66"/>' +
      '<path d="M13 27h38v4H13z" fill="#2B3550"/>' +
      '<circle cx="26" cy="34" r="2" fill="#2B2230"/><circle cx="38" cy="34" r="2" fill="#2B2230"/>' +
      '<path d="M22 30h7M35 30h7" stroke="#8C8C8C" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M21 42c4-4 8-4 11-2 3-2 7-2 11 2-4 2-8 2-11 0-3 2-7 2-11 0z" fill="#B9B9B9"/>',
  ),
  // Mira: goggles pushed up into the hair, a pencil behind the ear.
  mira: face(
    '#F4F1DE',
    '<path d="M14 64c2-12 9-17 18-17s16 5 18 17z" fill="#3FB8AF"/>' +
      '<path d="M15 36c0-14 7-21 17-21s17 7 17 21l-3 8H18z" fill="#6B3E2E"/>' +
      '<circle cx="32" cy="36" r="13" fill="#E3A982"/>' +
      '<rect x="20" y="20" width="10" height="7" rx="3.5" fill="#9BF6FF" stroke="#2B2230" stroke-width="2"/>' +
      '<rect x="34" y="20" width="10" height="7" rx="3.5" fill="#9BF6FF" stroke="#2B2230" stroke-width="2"/>' +
      '<circle cx="27" cy="36" r="2" fill="#2B2230"/><circle cx="37" cy="36" r="2" fill="#2B2230"/>' +
      '<path d="M27 42c3 3 7 3 10 0" stroke="#2B2230" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M45 30l6-9" stroke="#F2C14E" stroke-width="3" stroke-linecap="round"/>',
  ),
  // Pip: a small robot with screen eyes and an antenna.
  pip: face(
    '#FFD166',
    '<path d="M32 9v8" stroke="#2B2230" stroke-width="3"/><circle cx="32" cy="8" r="4" fill="#E85D75"/>' +
      '<rect x="14" y="17" width="36" height="32" rx="12" fill="#9FD8F2" stroke="#2B2230" stroke-width="3"/>' +
      '<circle cx="25" cy="31" r="6" fill="#2B2230"/><circle cx="39" cy="31" r="6" fill="#2B2230"/>' +
      '<circle cx="27" cy="29" r="2" fill="#FFFFFF"/><circle cx="41" cy="29" r="2" fill="#FFFFFF"/>' +
      '<path d="M26 42h12" stroke="#2B2230" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M20 55h24" stroke="#2B2230" stroke-width="4" stroke-linecap="round"/>',
  ),
  // The Voice from the depths: no face, a faint ember behind the static.
  voice: face(
    '#2A1A3A',
    '<g class="portrait-static" stroke="#BDA9D6" stroke-width="2" stroke-linecap="round" opacity="0.6">' +
      '<path d="M10 22h12M30 22h22M8 32h8M24 32h10M42 32h14M12 42h18M36 42h14"/></g>' +
      '<path class="portrait-ember" d="M32 46c-9-6-13-11-13-16a6 6 0 0 1 13-3 6 6 0 0 1 13 3c0 5-4 10-13 16z" fill="#FF8A3D"/>',
  ),
};

/** Small line emblems for the Album, one per relic (§7), 24 × 24 in the text colour. */
const glyph = (paths: string): string =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" ` +
  `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const RELIC_GLYPHS: readonly string[] = [
  glyph('<circle cx="12" cy="12" r="8"/><path d="M12 7c2 2 2 4 0 5-2-1-2-3 0-5zM9 16h6"/>'),
  glyph('<path d="M4 16c0-6 4-11 8-11s8 5 8 11z"/><path d="M8 16l2-8M12 16V6M16 16l-2-8"/>'),
  glyph('<path d="M4 20L20 4"/><path d="M7 17l2 2M10 14l2 2M13 11l2 2M16 8l2 2"/>'),
  glyph('<path d="M12 20c-4-3-6-6-6-9a6 6 0 0 1 12 0c0 3-2 6-6 9z"/><path d="M12 6V3"/>'),
  glyph('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  glyph('<path d="M4 6c4-2 12-2 16 0 0 8-3 13-8 14-5-1-8-6-8-14z"/><path d="M8 11h3M13 11h3"/>'),
  glyph('<path d="M5 19l2-12 5-3 5 3 2 12z"/><path d="M9 11h6M9 15h6"/>'),
  glyph('<circle cx="8" cy="8" r="4"/><path d="M11 11l9 9M16 16l2-2M18 18l2-2"/>'),
  glyph('<rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4 7l8 6 8-6"/>'),
  glyph('<path d="M12 3l2 6 6 1-5 4 2 7-5-4-5 4 2-7-5-4 6-1z"/>'),
];
