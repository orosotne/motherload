import type { ItemId } from '../data/items';
import type { UpgradeBranch } from '../data/upgrades';

/**
 * Small line icons, 24 × 24, drawn in the current text colour. Static markup only: these
 * strings go into innerHTML.
 */
const svg = (paths: string): string =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" ` +
  `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ITEM_ICONS: Readonly<Record<ItemId, string>> = {
  fuelCell: svg('<rect x="7" y="4" width="10" height="16" rx="2"/><path d="M12 8l-2 4h4l-2 4"/>'),
  repairKit: svg(
    '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M12 10v6M9 13h6M9 7V5h6v2"/>',
  ),
  charge: svg('<circle cx="11" cy="14" r="6"/><path d="M15 9l3-3M18 3v2M21 6h-2"/>'),
  megaCharge: svg('<circle cx="10" cy="14" r="7"/><path d="M15 8l3-3M19 2v2M22 5h-2M7 13h6"/>'),
  beacon: svg('<path d="M12 21V8M7 13l5-5 5 5"/><path d="M5 4h14"/>'),
  anchor: svg('<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 14a7 7 0 0 0 14 0M8 11h8"/>'),
};

export const UPGRADE_ICONS: Readonly<Record<UpgradeBranch, string>> = {
  drill: svg('<path d="M4 12h9l7-4v8l-7-4"/><path d="M8 9v6"/>'),
  hull: svg('<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>'),
  engine: svg('<path d="M8 3h8v9l-4 3-4-3z"/><path d="M10 17l2 4 2-4"/>'),
  tank: svg('<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/>'),
  cooling: svg('<path d="M12 2v20M4 7l16 10M20 7L4 17"/>'),
  cargo: svg('<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
  light: svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3 11v2h6v-2a6 6 0 0 0-3-11z"/>'),
};
