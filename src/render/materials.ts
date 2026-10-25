import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  MeshStandardMaterial,
  OctahedronGeometry,
  SphereGeometry,
  TetrahedronGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Block, type BlockId } from '../data/blocks';
import { MINERALS, type CrystalShape } from '../data/minerals';
import { ZONES, zoneAt } from '../data/zones';
import type { BlockLooks, DecorLook, DecorLooks } from './chunkMesher';

/**
 * Block colours per zone (§8). The palette's darkest colour of zones 3–5 is the rock itself;
 * lifted a little, because unlit near-black cubes would not read at all.
 */
const ROCK_COLORS: Readonly<Record<number, string>> = {
  1: '#C9733A',
  2: '#B5654A',
  3: '#2C3D6B',
  4: '#2D2D36',
  5: '#3D2160',
};

/** Back wall per zone: the zone's darkest tone, darker still. */
export function backWallColor(zoneIndex: number): Color {
  const zone = ZONES[zoneIndex - 1];
  const darkest = zoneIndex <= 2 ? zone?.colors[2] : zone?.colors[0];
  return new Color(darkest ?? '#222').multiplyScalar(0.55);
}

/**
 * Looks of all cube blocks: zone-coloured rock (gas pockets and relics hide in it), steel-grey
 * corestone and glowing lava (§4, §8).
 */
export function createBlockLooks(): BlockLooks {
  const rock = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 });
  const corestone = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.7 });
  // See-through enough that a pod sinking in it stays visible.
  const lava = new MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#FF5A14',
    emissiveIntensity: 0.85,
    roughness: 0.55,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const lavaColor = new Color('#FFB347');
  const rockColors = new Map<number, Color>();
  for (const zone of ZONES) {
    rockColors.set(zone.index, new Color(ROCK_COLORS[zone.index] ?? '#888'));
  }
  const corestoneColor = new Color('#8B93A6');

  const drawn = new Set<BlockId>([
    Block.Dirt,
    Block.Clay,
    Block.Rock,
    Block.Basalt,
    Block.Ancient,
    Block.Gas,
    Block.Ore,
    Block.Relic,
  ]);
  return (block, row) => {
    if (block === Block.Corestone) return { material: corestone, color: corestoneColor };
    if (block === Block.Lava) return { material: lava, color: lavaColor };
    if (!drawn.has(block)) return null;
    const color = rockColors.get(zoneAt(row).index);
    return color ? { material: rock, color } : null;
  };
}

function crystalGeometry(shape: CrystalShape): BufferGeometry {
  switch (shape) {
    case 'cube':
      return new BoxGeometry(0.36, 0.36, 0.36);
    case 'tetra':
      return new TetrahedronGeometry(0.32);
    case 'octa':
      return new OctahedronGeometry(0.3);
    case 'dodeca':
      return new DodecahedronGeometry(0.27);
    case 'prism':
      return new CylinderGeometry(0.15, 0.15, 0.52, 6);
    case 'spike':
      return new ConeGeometry(0.2, 0.56, 5);
    case 'shard':
      return new OctahedronGeometry(0.3).scale(0.5, 1.5, 0.5);
    case 'star':
      return new IcosahedronGeometry(0.3, 0);
    case 'pearl':
      return new SphereGeometry(0.25, 18, 12);
  }
}

/** Three small bubbles in a gas pocket's face: almost plain rock, but not quite (§4). */
function bubbleGeometry(): BufferGeometry {
  const bubbles = [
    [-0.18, 0.12, 0.07],
    [0.14, -0.06, 0.055],
    [0.02, 0.2, 0.045],
  ].map(([x = 0, y = 0, r = 0.05]) => new SphereGeometry(r, 10, 8).translate(x, y, 0));
  return mergeGeometries(bubbles) ?? new SphereGeometry(0.06);
}

const DECOR_GAS = 100;
const DECOR_RELIC = 101;

/**
 * Decorations in block faces: one crystal per mineral with its own shape and colour, glowing
 * softly in the dark (§3, §6); bubbles on gas pockets; a gold emblem on relics.
 */
export function createDecorLooks(): DecorLooks {
  const crystals = new Map<number, DecorLook>();
  for (const mineral of MINERALS) {
    const color = new Color(mineral.color);
    crystals.set(mineral.id, {
      key: mineral.id,
      geometry: crystalGeometry(mineral.shape),
      material: new MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.45,
        roughness: 0.25,
        metalness: 0.1,
      }),
      turn: true,
    });
  }
  const gas: DecorLook = {
    key: DECOR_GAS,
    geometry: bubbleGeometry(),
    material: new MeshStandardMaterial({
      color: '#E6F7B0',
      transparent: true,
      opacity: 0.6,
      roughness: 0.15,
    }),
    turn: false,
  };
  const relic: DecorLook = {
    key: DECOR_RELIC,
    geometry: new TorusGeometry(0.2, 0.065, 10, 24),
    material: new MeshStandardMaterial({
      color: '#FFD166',
      emissive: '#FFB703',
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.3,
    }),
    turn: false,
  };
  return (block, mineral) => {
    if (block === Block.Ore) return crystals.get(mineral) ?? null;
    if (block === Block.Gas) return gas;
    if (block === Block.Relic) return relic;
    return null;
  };
}
