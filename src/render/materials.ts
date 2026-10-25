import { MeshStandardMaterial, type Material } from 'three';
import { Block, type BlockId } from '../data/blocks';
import type { BlockMaterials } from './chunkMesher';

/**
 * F1 look: every solid block is a grey cube, with darker grey for blocks that cannot be drilled.
 * F2 replaces this with the zone palettes.
 */
export function createGreyMaterials(): BlockMaterials {
  const drillable = new MeshStandardMaterial({ color: '#9a9a9a', roughness: 0.9 });
  const tougher = new MeshStandardMaterial({ color: '#7d7d7d', roughness: 0.9 });
  const unbreakable = new MeshStandardMaterial({ color: '#45454d', roughness: 0.7 });
  const looks: Partial<Record<BlockId, Material>> = {
    [Block.Dirt]: drillable,
    [Block.Clay]: tougher,
    [Block.Rock]: tougher,
    [Block.Basalt]: tougher,
    [Block.Ancient]: tougher,
    [Block.Gas]: drillable,
    [Block.Ore]: drillable,
    [Block.Relic]: drillable,
    [Block.Corestone]: unbreakable,
  };
  return (block) => looks[block] ?? null;
}
