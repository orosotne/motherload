import { MathUtils, Vector3, type Scene, type WebGLRenderer } from 'three';
import type { EventBus } from '../core/events';
import { ENGINE } from '../data/engine';
import type { GameEvents } from '../sim/events';
import type { GameState, SimSettings } from '../sim/game';
import { rowOf } from '../sim/pod';
import { createBlockLooks, type BlockLooks } from './blockLooks';
import { BloomRenderer } from './bloom';
import { createBuildings } from './buildingsView';
import { CameraRig } from './camera';
import { clampView, followTarget, smoothToward } from './cameraMath';
import { createChunkBorders } from './chunkBorders';
import { ChunkRenderer } from './chunkMesher';
import { createDecorLooks, type DecorLooks } from './decorLooks';
import { DroneView, rescueProgress, towLift } from './droneView';
import { Burst } from './effects/burst';
import { FeelEffects } from './effects/feelFx';
import { landingTrauma, Shake } from './effects/shake';
import { Lighting } from './lighting';
import { createParallax } from './parallax';
import { PodView } from './podView';
import { bindResize, createRenderer } from './renderer';
import { createScene } from './scene';

/** Blocks of rock and sky the camera may show beyond the world's edges. */
const EDGE_MARGIN = 1;
const SKY_MARGIN = 3;

/**
 * Everything the player sees of the world (§8): toon blocks with outlined crystals, parallax
 * cave walls, light and darkness, the pod, effects and bloom. It only reads the simulation state
 * and reacts to its events (GAME_SPEC §9.5).
 */
export class GameView {
  readonly renderer: WebGLRenderer;
  readonly rig = new CameraRig();
  private readonly scene: Scene;
  private readonly bloom: BloomRenderer;
  private readonly lighting: Lighting;
  private readonly blockLooks: BlockLooks;
  private readonly decorLooks: DecorLooks;
  private readonly chunks: ChunkRenderer;
  private readonly pod: PodView;
  private readonly drone = new DroneView();
  private readonly burst = new Burst();
  private readonly blast = new Burst(0.45);
  private readonly effects: FeelEffects;
  private readonly shake = new Shake();
  private readonly projected = new Vector3();
  private readonly borders: ReturnType<typeof createChunkBorders>;
  private cameraX: number;
  private cameraY: number;
  private time = 0;
  private readable: boolean;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly state: GameState,
    private readonly settings: SimSettings,
    events: EventBus<GameEvents>,
  ) {
    this.renderer = createRenderer(canvas);
    this.scene = createScene();
    this.bloom = new BloomRenderer(this.renderer, this.scene, this.rig.camera);
    bindResize(this.renderer, (width, height) => {
      this.rig.setAspect(width / height);
      this.bloom.setSize(width, height);
    });
    this.lighting = new Lighting(this.scene);

    this.blockLooks = createBlockLooks(settings.feel);
    this.decorLooks = createDecorLooks(settings.feel);
    this.readable = settings.feel.readability.enabled;
    this.chunks = new ChunkRenderer(state.grid, this.blockLooks.look, this.decorLooks.look);
    this.pod = new PodView(settings.pod.halfSize);
    this.effects = new FeelEffects(state, settings, events);
    this.borders = createChunkBorders(state.grid);
    this.scene.add(
      this.borders,
      this.chunks.group,
      createParallax(state.grid),
      createBuildings(),
      this.pod.root,
      this.drone.root,
      this.burst.mesh,
      this.blast.mesh,
      this.effects.group,
    );
    this.cameraX = state.pod.x;
    this.cameraY = state.pod.y;

    events.on('Landed', ({ speed }) => this.onLanded(speed));
    events.on('EngineStarted', () => {
      const { squash } = this.settings.feel;
      this.pod.startPulse(squash.liftScaleX, squash.liftScaleY, squash.liftMs);
    });
    events.on('Destroyed', () => {
      this.burst.start(this.state.pod.x, this.state.pod.y);
      this.shake.add(0.8);
    });
    events.on('Explosion', ({ col, row, radius, source }) => {
      this.blast.start(col, -row, radius + 0.8);
      this.shake.add(source === 'gas' ? 0.55 : 0.35 + radius * 0.2);
    });
    events.on('Rescued', () => this.snapCamera());
    events.on('Respawned', () => this.snapCamera());
    events.on('Teleported', () => this.snapCamera());
  }

  /** Jumps the camera to the pod, e.g. after a teleport. */
  snapCamera(): void {
    this.cameraX = this.state.pod.x;
    this.cameraY = this.state.pod.y;
  }

  /** Debug lines on the chunk borders (§9.9). */
  set chunkBorders(visible: boolean) {
    this.borders.visible = visible;
  }

  get chunkBorders(): boolean {
    return this.borders.visible;
  }

  /** Where a world point shows on screen, in CSS pixels from the top left. */
  project(x: number, y: number): { x: number; y: number } {
    const point = this.projected.set(x, y, 0.5).project(this.rig.camera);
    const canvas = this.renderer.domElement;
    return {
      x: ((point.x + 1) / 2) * canvas.clientWidth,
      y: ((1 - point.y) / 2) * canvas.clientHeight,
    };
  }

  /** `paused`: a menu stops the game, so the pod stops shaking and its drill stops turning. */
  render(alpha: number, frameSeconds: number, paused = false): void {
    this.renderer.info.reset();
    this.time += frameSeconds;
    const { feel } = this.settings;
    if (feel.readability.enabled !== this.readable) {
      // Readability (§5.12) was switched in the debug panel: every chunk changes its look.
      this.readable = feel.readability.enabled;
      this.chunks.invalidate();
    }
    this.blockLooks.update(this.time);
    this.decorLooks.update(this.time);

    const progress = rescueProgress(this.state);
    const lift = towLift(progress);
    const { pod } = this.state;
    this.pod.update(pod, alpha, frameSeconds, {
      pulses: feel.squash.enabled,
      drillShake: feel.drillLife.enabled && !paused ? feel.drillLife.shake : 0,
      paused,
      hidden: this.state.status.kind === 'respawn',
      lift,
      tiers: this.state.tiers,
    });
    const podX = pod.prevX + (pod.x - pod.prevX) * alpha;
    const podY = pod.prevY + (pod.y - pod.prevY) * alpha + lift;
    this.drone.update(progress, podX, podY, frameSeconds);
    this.burst.update(frameSeconds);
    this.blast.update(frameSeconds);
    this.effects.update(frameSeconds);
    this.updateCamera(alpha, frameSeconds, lift);
    this.chunks.update(rowOf(this.cameraY));
    const { grid, stats } = this.state;
    this.lighting.update(
      pod,
      podX,
      podY,
      this.cameraX,
      this.cameraY,
      grid,
      stats.lightRange,
      frameSeconds,
    );
    this.bloom.render();
  }

  private onLanded(speed: number): void {
    const { squash, shake } = this.settings.feel;
    if (speed >= squash.minLandingSpeed) {
      this.pod.startPulse(squash.landScaleX, squash.landScaleY, squash.landMs);
    }
    const top = this.settings.pod.maxFallSpeed;
    this.shake.add(landingTrauma(speed, shake.landingMinSpeed, top, shake.landingMaxTrauma));
  }

  /** Smooth follow with lookahead (§5.8), kept inside the world, plus screen shake (§5.7). */
  private updateCamera(alpha: number, dt: number, lift: number): void {
    const { pod, grid, stats } = this.state;
    const { camera, shake } = this.settings.feel;
    const x = pod.prevX + (pod.x - pod.prevX) * alpha;
    const y = pod.prevY + (pod.y - pod.prevY) * alpha + lift;
    if (camera.enabled) {
      // Velocity from the last tick's displacement also covers gliding while drilling.
      const velocity = {
        x: (pod.x - pod.prevX) * ENGINE.simHz,
        y: (pod.y - pod.prevY) * ENGINE.simHz,
      };
      const speeds = {
        drive: this.settings.pod.driveSpeed,
        fall: this.settings.pod.maxFallSpeed,
        climb: stats.climbSpeed,
      };
      const target = followTarget({ x, y }, velocity, camera, speeds);
      this.cameraX = smoothToward(this.cameraX, target.x, camera.followRate, dt);
      this.cameraY = smoothToward(this.cameraY, target.y, camera.followRate, dt);
    } else {
      this.cameraX = x;
      this.cameraY = y;
    }

    const half = this.rig.halfView();
    const viewX = clampView(
      this.cameraX,
      half.width,
      -0.5 - EDGE_MARGIN,
      grid.width - 0.5 + EDGE_MARGIN,
    );
    const skyTop = 0.5 + grid.skyRows + SKY_MARGIN;
    const viewY = clampView(this.cameraY, half.height, -grid.height + 0.5 - EDGE_MARGIN, skyTop);

    this.shake.update(dt, shake.decayPerSecond);
    const offset = shake.enabled
      ? this.shake.offset(shake.maxOffset, MathUtils.degToRad(shake.maxRollDeg), shake.frequency)
      : { x: 0, y: 0, roll: 0 };
    this.rig.setFocus(viewX + offset.x, viewY + offset.y, offset.roll);
  }
}
