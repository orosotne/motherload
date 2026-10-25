import { BoxGeometry, Color, Vector3, type BufferGeometry } from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { Block, type BlockId } from '../data/blocks';
import type { FeelConfig } from '../data/feel';
import { ZONES, zoneAt } from '../data/zones';
import type { BlockLook } from './chunkMesher';
import { rockColor } from './palette';
import { toon } from './toon';

/** Bevel of the block edges in blocks (§8). */
const BEVEL = 0.08;

export interface BlockLooks {
  look: (block: BlockId, row: number) => BlockLook | null;
  /** Moves the animated looks along: lava breathes (§5.12). */
  update: (seconds: number) => void;
}

/**
 * A unit cube with its edges cut flat at 45° (§8: bevel 0.08): the hull of the 24 points one
 * bevel away from each corner along its three edges. 68 triangles with flat normals, so the
 * bevels catch the toon light as crisp bands.
 */
export function bevelledCube(): BufferGeometry {
  const points: Vector3[] = [];
  const inner = 0.5 - BEVEL;
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        points.push(
          new Vector3(x * inner, y * 0.5, z * 0.5),
          new Vector3(x * 0.5, y * inner, z * 0.5),
          new Vector3(x * 0.5, y * 0.5, z * inner),
        );
      }
    }
  }
  return new ConvexGeometry(points);
}

/**
 * Lava as a liquid: the surface sits lower than a block's top, so a pool reads as a pool and
 * not as an orange block, even without colour (§5.12).
 */
function lavaGeometry(): BufferGeometry {
  return new BoxGeometry(1, 0.86, 1).translate(0, -0.07, 0);
}

/**
 * Looks of all cube blocks (§4, §8): zone-coloured toon rock (gas pockets and relics hide in
 * it), steel-grey corestone and glowing lava. With readability (§5.12) off, lava is a plain
 * orange cube and gas a tinted rock: told apart by colour only, for comparison.
 */
export function createBlockLooks(feel: FeelConfig): BlockLooks {
  const cube = bevelledCube();
  const rock = toon({ color: '#ffffff' });
  const corestone = toon({ color: '#ffffff' });
  const lava = toon({ color: '#ffffff', emissive: '#E8480C', emissiveIntensity: 0.7 });
  const lavaShape = lavaGeometry();
  const rockColors = new Map<number, Color>(
    ZONES.map((zone) => [zone.index, rockColor(zone.index)]),
  );
  const corestoneColor = new Color('#8B93A6');
  const lavaColor = new Color('#FF8A3D');
  const gasTint = new Color('#9DBF6B');
  const drawn = new Set<BlockId>([
    Block.Dirt,
    Block.Clay,
    Block.Rock,
    Block.Basalt,
    Block.Ancient,
    Block.Ore,
    Block.Relic,
    Block.Gas,
  ]);

  return {
    look: (block, row) => {
      const readable = feel.readability.enabled;
      if (block === Block.Corestone) {
        return { material: corestone, color: corestoneColor, geometry: cube, shadows: true };
      }
      if (block === Block.Lava) {
        const geometry = readable ? lavaShape : cube;
        return { material: lava, color: lavaColor, geometry, shadows: false, glow: true };
      }
      if (!drawn.has(block)) return null;
      const base = rockColors.get(zoneAt(row).index);
      if (!base) return null;
      const color = block === Block.Gas && !readable ? base.clone().lerp(gasTint, 0.35) : base;
      return { material: rock, color, geometry: cube, shadows: true };
    },
    update: (seconds) => {
      const breathe = feel.readability.enabled ? 0.18 * Math.sin(seconds * 2.4) : 0;
      lava.emissiveIntensity = 0.7 + breathe;
    },
  };
}
