import { describe, expect, it } from 'vitest';
import { Block } from '../src/data/blocks';
import { Grid } from '../src/world/grid';

function grid(): Grid {
  return new Grid(40, 100, 20, 12);
}

describe('Grid', () => {
  it('stores blocks and their mineral ids', () => {
    const world = grid();
    world.set(3, 4, Block.Ore, 7);
    expect(world.get(3, 4)).toBe(Block.Ore);
    expect(world.mineral(3, 4)).toBe(7);
    expect(world.get(4, 4)).toBe(Block.Empty);
  });

  it('is open sky above the surface up to skyRows, and closed beyond', () => {
    const world = grid();
    expect(world.get(10, -1)).toBe(Block.Empty);
    expect(world.get(10, -12)).toBe(Block.Empty);
    expect(world.get(10, -13)).toBe(Block.Bedrock);
  });

  it('is surrounded by an indestructible border at the sides and the bottom', () => {
    const world = grid();
    expect(world.get(-1, 5)).toBe(Block.Bedrock);
    expect(world.get(40, 5)).toBe(Block.Bedrock);
    expect(world.get(-1, -3)).toBe(Block.Bedrock);
    expect(world.get(10, 100)).toBe(Block.Bedrock);
  });

  it('refuses to write outside the grid', () => {
    expect(() => grid().set(40, 0, Block.Dirt)).toThrow(RangeError);
    expect(() => grid().set(0, -1, Block.Dirt)).toThrow(RangeError);
  });

  it('bumps the version of the touched chunk only', () => {
    const world = grid();
    const touched = world.chunkIndex(25, 47);
    const other = world.chunkIndex(5, 47);
    world.set(25, 47, Block.Dirt);
    expect(world.chunkVersion(touched)).toBe(1);
    expect(world.chunkVersion(other)).toBe(0);
  });

  it('maps cells to 20 × 20 chunks', () => {
    const world = grid();
    expect([world.chunkCols, world.chunkRows]).toEqual([2, 5]);
    expect(world.chunkIndex(19, 19)).toBe(0);
    expect(world.chunkIndex(20, 0)).toBe(1);
    expect(world.chunkIndex(0, 20)).toBe(2);
    expect(world.chunkIndex(39, 99)).toBe(9);
  });

  it('fills every cell and marks every chunk changed', () => {
    const world = grid();
    world.fill(Block.Dirt);
    expect(world.get(0, 0)).toBe(Block.Dirt);
    expect(world.get(39, 99)).toBe(Block.Dirt);
    for (let i = 0; i < 10; i++) expect(world.chunkVersion(i)).toBe(1);
  });
});
