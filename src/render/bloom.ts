import {
  Color,
  HalfFloatType,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RENDER } from '../data/render';
import { BLOOM_LAYER } from './toon';

const BLACK = new Color(0, 0, 0);

const MIX_SHADER = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D baseTexture;
    uniform sampler2D bloomTexture;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
    }`,
};

/**
 * Bloom on the glowing layer only (§8): crystals, lava, relics and flames are drawn alone,
 * unlit and without fog, blurred, and added on top of the normal picture.
 */
export class BloomRenderer {
  private readonly glowComposer: EffectComposer;
  private readonly finalComposer: EffectComposer;
  private readonly bloom: UnrealBloomPass;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    private readonly camera: Camera,
  ) {
    const size = renderer.getSize(new Vector2());
    const { strength, radius, threshold } = RENDER.bloom;
    this.glowComposer = new EffectComposer(renderer);
    this.glowComposer.renderToScreen = false;
    this.glowComposer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(size, strength, radius, threshold);
    this.glowComposer.addPass(this.bloom);

    // Antialiased, high-range target for the normal picture.
    const target = new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType, samples: 4 });
    this.finalComposer = new EffectComposer(renderer, target);
    this.finalComposer.addPass(new RenderPass(scene, camera));
    const mix = new ShaderPass(
      new ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.glowComposer.renderTarget2.texture },
        },
        ...MIX_SHADER,
      }),
      'baseTexture',
    );
    mix.needsSwap = true;
    this.finalComposer.addPass(mix);
    this.finalComposer.addPass(new OutputPass());
  }

  setSize(width: number, height: number): void {
    const ratio = this.renderer.getPixelRatio();
    for (const composer of [this.glowComposer, this.finalComposer]) {
      composer.setPixelRatio(ratio);
      composer.setSize(width, height);
    }
  }

  render(): void {
    const { scene, camera } = this;
    const background = scene.background;
    const fog = scene.fog;
    scene.background = BLACK;
    scene.fog = null;
    camera.layers.set(BLOOM_LAYER);
    this.glowComposer.render();
    camera.layers.set(0);
    scene.background = background;
    scene.fog = fog;
    this.finalComposer.render();
  }
}
