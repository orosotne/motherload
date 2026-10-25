import {
  BackSide,
  Color,
  DataTexture,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  type ColorRepresentation,
  type MeshToonMaterialParameters,
} from 'three';

/** Layer of everything that glows: only it feeds the bloom (§8). */
export const BLOOM_LAYER = 1;

let gradient: DataTexture | null = null;

/** The three light steps of the toon shading (§8): shadow, mid tone, lit. */
export function toonGradient(): DataTexture {
  if (gradient) return gradient;
  gradient = new DataTexture(new Uint8Array([90, 170, 255]), 3, 1, RedFormat);
  gradient.minFilter = NearestFilter;
  gradient.magFilter = NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

/** A toon material on the shared three-step gradient. */
export function toon(parameters: MeshToonMaterialParameters = {}): MeshToonMaterial {
  return new MeshToonMaterial({ gradientMap: toonGradient(), ...parameters });
}

/**
 * Inverted-hull outline (§8): the back faces of the same geometry, pushed out along the normals
 * in the vertex shader, so it also works for instanced meshes.
 */
export function outlineMaterial(
  width: number,
  color: ColorRepresentation = '#1d1424',
): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ color: new Color(color), side: BackSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.outlineWidth = { value: width };
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform float outlineWidth;\nvoid main() {')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed += normalize( normal ) * outlineWidth;',
      );
  };
  // Shaders with different widths must not share a compiled program.
  material.customProgramCacheKey = () => `outline-${width}`;
  return material;
}
