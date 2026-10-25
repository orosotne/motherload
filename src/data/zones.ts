import { Block, type BlockId } from './blocks';

/** A depth zone (GAME_SPEC §4). Rows are inclusive. */
export interface ZoneConfig {
  /** 1 to 5. */
  index: number;
  /** i18n key of the zone name. */
  key: string;
  firstRow: number;
  lastRow: number;
  /** Base material of the zone. */
  base: BlockId;
  /** Palette exactly as listed in §8. */
  colors: readonly [string, string, string];
}

export const ZONES: readonly ZoneConfig[] = [
  {
    index: 1,
    key: 'zone.rustSoil',
    firstRow: 0,
    lastRow: 49,
    base: Block.Dirt,
    colors: ['#E8A15A', '#C9733A', '#8A4B2A'],
  },
  {
    index: 2,
    key: 'zone.clayCaves',
    firstRow: 50,
    lastRow: 149,
    base: Block.Clay,
    colors: ['#B5654A', '#7A3E2E', '#4A2620'],
  },
  {
    index: 3,
    key: 'zone.crystalDepths',
    firstRow: 150,
    lastRow: 274,
    base: Block.Rock,
    colors: ['#1E2A4A', '#2EC4B6', '#9BF6FF'],
  },
  {
    index: 4,
    key: 'zone.magmaMantle',
    firstRow: 275,
    lastRow: 424,
    base: Block.Basalt,
    colors: ['#1A1A1F', '#FF6B1A', '#FFB347'],
  },
  {
    index: 5,
    key: 'zone.core',
    firstRow: 425,
    lastRow: 499,
    base: Block.Ancient,
    colors: ['#2B1640', '#9D4EDD', '#FFD166'],
  },
];

/** Zone a row belongs to; rows above the surface count as zone 1, rows below the core as zone 5. */
export function zoneAt(row: number): ZoneConfig {
  const zone = ZONES.find((candidate) => row <= candidate.lastRow) ?? ZONES[ZONES.length - 1];
  if (!zone) throw new Error('No zones configured');
  return zone;
}
