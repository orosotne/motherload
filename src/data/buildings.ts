/** Surface buildings (GAME_SPEC §3, §7): the pod enters one by standing in front of it. */
export type BuildingId = 'fuel' | 'buyer' | 'workshop' | 'supply';

export interface BuildingConfig {
  id: BuildingId;
  /** Columns in front of the building, inclusive. */
  firstCol: number;
  lastCol: number;
  /** i18n key of the name. */
  key: string;
  /** Wall and sign colours. */
  color: string;
  signColor: string;
}

/** Inside the town plateau, columns 14 to 26; the pod starts between them in column 20. */
export const BUILDINGS: readonly BuildingConfig[] = [
  {
    id: 'fuel',
    firstCol: 14,
    lastCol: 16,
    key: 'building.fuel',
    color: '#5FA8D3',
    signColor: '#FFD166',
  },
  {
    id: 'buyer',
    firstCol: 17,
    lastCol: 19,
    key: 'building.buyer',
    color: '#E07A5F',
    signColor: '#F4F1DE',
  },
  {
    id: 'workshop',
    firstCol: 21,
    lastCol: 23,
    key: 'building.workshop',
    color: '#81B29A',
    signColor: '#F2CC8F',
  },
  {
    id: 'supply',
    firstCol: 24,
    lastCol: 26,
    key: 'building.supply',
    color: '#9D79BC',
    signColor: '#FFE8A3',
  },
];
