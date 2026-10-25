import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  MeshToonMaterial,
  OctahedronGeometry,
  SphereGeometry,
  TetrahedronGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Block, type BlockId } from '../data/blocks';
import type { FeelConfig } from '../data/feel';
import { MINERALS, type CrystalShape } from '../data/minerals';
import type { DecorLook } from './chunkMesher';
import { outlineMaterial, toon } from './toon';

const DECOR_GAS = 100;
const DECOR_RELIC = 101;
const DECOR_CORESTONE = 102;

export interface DecorLooks {
  look: (block: BlockId, mineral: number) => DecorLook | null;
  /** Moves the animated looks along: gas bubbles bubble (§5.12). */
  update: (seconds: number) => void;
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

/** Small spheres at given spots of a block's face, merged into one geometry. */
function dots(spots: readonly (readonly [number, number, number])[], detail = 10): BufferGeometry {
  const parts = spots.map(([x, y, r]) =>
    new SphereGeometry(r, detail, detail - 2).translate(x, y, 0),
  );
  return mergeGeometries(parts) ?? new SphereGeometry(0.06);
}

/**
 * Bubbles that swell and shrink, each gas pocket in its own rhythm (taken from the instance's
 * position), so pockets read by movement and not only by colour (§5.12).
 */
function bubbling(material: MeshToonMaterial, time: { value: number }): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.bubbleTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform float bubbleTime;\nvoid main() {')
      .replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          'float phase = 0.0;',
          '#ifdef USE_INSTANCING',
          'phase = instanceMatrix[3].x * 1.7 + instanceMatrix[3].y * 2.3;',
          '#endif',
          'transformed *= 0.8 + 0.35 * abs( sin( bubbleTime * 2.2 + phase + position.x * 9.0 ) );',
        ].join('\n'),
      );
  };
}

/**
 * Decorations in block faces: one crystal per mineral with its own shape and colour, glowing
 * softly in the dark and outlined (§3, §6, §8); bubbles on gas pockets; a gold ring on relics;
 * bolts on corestone. The last two kinds of shape cues go away with readability (§5.12) off.
 */
export function createDecorLooks(feel: FeelConfig): DecorLooks {
  const crystalOutline = outlineMaterial(0.035);
  const crystals = new Map<number, DecorLook>();
  for (const mineral of MINERALS) {
    const color = new Color(mineral.color);
    crystals.set(mineral.id, {
      key: mineral.id,
      geometry: crystalGeometry(mineral.shape),
      material: toon({ color, emissive: color, emissiveIntensity: 0.22 }),
      turn: true,
      glow: true,
      outline: crystalOutline,
    });
  }
  const time = { value: 0 };
  const bubbleMaterial = toon({ color: '#E6F7B0', emissive: '#7A8F3A', emissiveIntensity: 0.05 });
  bubbling(bubbleMaterial, time);
  const gas: DecorLook = {
    key: DECOR_GAS,
    geometry: dots([
      [-0.18, 0.12, 0.075],
      [0.14, -0.06, 0.06],
      [0.02, 0.21, 0.05],
      [-0.05, -0.2, 0.045],
    ]),
    material: bubbleMaterial,
    turn: false,
    glow: false,
  };
  const relic: DecorLook = {
    key: DECOR_RELIC,
    geometry: new TorusGeometry(0.2, 0.065, 10, 24),
    material: toon({ color: '#FFD166', emissive: '#FFB703', emissiveIntensity: 0.45 }),
    turn: false,
    glow: true,
    outline: outlineMaterial(0.03),
  };
  const corestone: DecorLook = {
    key: DECOR_CORESTONE,
    geometry: dots(
      [
        [-0.3, 0.3, 0.06],
        [0.3, 0.3, 0.06],
        [-0.3, -0.3, 0.06],
        [0.3, -0.3, 0.06],
      ],
      8,
    ),
    material: toon({ color: '#5E6577' }),
    turn: false,
    glow: false,
  };

  return {
    look: (block, mineral) => {
      if (block === Block.Ore) return crystals.get(mineral) ?? null;
      if (block === Block.Relic) return relic;
      if (!feel.readability.enabled) return null;
      if (block === Block.Gas) return gas;
      if (block === Block.Corestone) return corestone;
      return null;
    },
    update: (seconds) => {
      time.value = seconds;
    },
  };
}
