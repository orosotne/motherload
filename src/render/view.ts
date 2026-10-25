import { MathUtils, type Scene, type WebGLRenderer } from 'three';
import type { EventBus } from '../core/events';
import { ENGINE } from '../data/engine';
import type { GameEvents } from '../sim/events';
import type { GameState, SimSettings } from '../sim/game';
import { rowOf } from '../sim/pod';
import { createBackdrop } from './backdrop';
import { CameraRig } from './camera';
import { clampView, followTarget, smoothToward } from './cameraMath';
import { createBuildings } from './buildingsView';
import { ChunkRenderer } from './chunkMesher';
import { DroneView, rescueProgress, towLift } from './droneView';
import { Burst } from './effects/burst';
import { landingTrauma, Shake } from './effects/shake';
import { createBlockLooks, createDecorLooks } from './materials';
import { PodView } from './podView';
import { bindResize, createRenderer } from './renderer';
import { createScene } from './scene';

/** Blocks of rock and sky the camera may show beyond the world's edges. */
const EDGE_MARGIN = 1;
const SKY_MARGIN = 3;

/**
 * Everything the player sees of the world: grid, pod and camera. It only reads the simulation
 * state and reacts to its events (GAME_SPEC §9.5).
 */
export class GameView {
  readonly renderer: WebGLRenderer;
  readonly rig = new CameraRig();
  private readonly scene: Scene;
  private readonly chunks: ChunkRenderer;
  private readonly pod: PodView;
  private readonly drone = new DroneView();
  private readonly burst = new Burst();
  private readonly blast = new Burst(0.45);
  private readonly shake = new Shake();
  private cameraX: number;
  private cameraY: number;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly state: GameState,
    private readonly settings: SimSettings,
    events: EventBus<GameEvents>,
  ) {
    this.renderer = createRenderer(canvas);
    this.scene = createScene();
    bindResize(this.renderer, (width, height) => this.rig.setAspect(width / height));

    this.chunks = new ChunkRenderer(state.grid, createBlockLooks(), createDecorLooks());
    this.pod = new PodView(settings.pod.halfSize);
    this.scene.add(
      this.chunks.group,
      createBackdrop(state.grid),
      createBuildings(),
      this.pod.root,
      this.drone.root,
      this.burst.mesh,
      this.blast.mesh,
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

  render(alpha: number, frameSeconds: number): void {
    this.renderer.info.reset();
    const progress = rescueProgress(this.state);
    const lift = towLift(progress);
    const { pod } = this.state;
    this.pod.update(pod, alpha, frameSeconds, {
      pulses: this.settings.feel.squash.enabled,
      hidden: this.state.status.kind === 'respawn',
      lift,
    });
    const podX = pod.prevX + (pod.x - pod.prevX) * alpha;
    const podY = pod.prevY + (pod.y - pod.prevY) * alpha + lift;
    this.drone.update(progress, podX, podY, frameSeconds);
    this.burst.update(frameSeconds);
    this.blast.update(frameSeconds);
    this.updateCamera(alpha, frameSeconds, lift);
    this.chunks.update(rowOf(this.cameraY));
    this.renderer.render(this.scene, this.rig.camera);
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
