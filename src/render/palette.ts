import { Color } from 'three';
import { ZONES } from '../data/zones';

/**
 * Rock colours per zone (§8). The palette's darkest colour of zones 3 to 5 is the rock itself,
 * lifted a little, because near-black cubes would not read at all.
 */
const ROCK_COLORS: Readonly<Record<number, string>> = {
  1: '#C9733A',
  2: '#B5654A',
  3: '#2C3D6B',
  4: '#2D2D36',
  5: '#3D2160',
};

export function rockColor(zoneIndex: number): Color {
  return new Color(ROCK_COLORS[zoneIndex] ?? '#888888');
}

/** The zone's darkest tone, darker still: walls far behind the playfield. */
export function backWallColor(zoneIndex: number): Color {
  const zone = ZONES[zoneIndex - 1];
  const darkest = zoneIndex <= 2 ? zone?.colors[2] : zone?.colors[0];
  return new Color(darkest ?? '#222222').multiplyScalar(0.55);
}

/** Depth haze in the zone's colour (§8): the accent colour, dimmed into the dark. */
export function fogColor(zoneIndex: number): Color {
  const zone = ZONES[zoneIndex - 1];
  const tone = zoneIndex <= 2 ? zone?.colors[1] : zone?.colors[1];
  return new Color(tone ?? '#222222').multiplyScalar(zoneIndex <= 2 ? 0.35 : 0.22);
}
