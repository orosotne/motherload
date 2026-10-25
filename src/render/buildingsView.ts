import {
  BoxGeometry,
  CanvasTexture,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import { BUILDINGS, type BuildingConfig, type BuildingId } from '../data/buildings';
import { toon } from './toon';

/** Buildings stand behind the play plane, so the pod drives in front of them. */
const DEPTH = -1.4;
const HEIGHT = 2.1;
const GROUND = 0.5;

type Painter = (ctx: CanvasRenderingContext2D, size: number) => void;

/** Sign icons drawn as shapes, readable in any language (§8: light signs). */
const ICONS: Readonly<Record<BuildingId, Painter>> = {
  fuel: (ctx, size) => {
    // A drop of fuel.
    ctx.beginPath();
    ctx.moveTo(size / 2, size * 0.14);
    ctx.bezierCurveTo(size * 0.8, size * 0.5, size * 0.78, size * 0.86, size / 2, size * 0.86);
    ctx.bezierCurveTo(size * 0.22, size * 0.86, size * 0.2, size * 0.5, size / 2, size * 0.14);
    ctx.fill();
  },
  buyer: (ctx, size) => {
    ctx.font = `bold ${size * 0.72}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', size / 2, size * 0.54);
  },
  workshop: (ctx, size) => {
    // A gear: a ring with eight teeth.
    ctx.save();
    ctx.translate(size / 2, size / 2);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size * 0.07, -size * 0.38, size * 0.14, size * 0.16);
    }
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.26, 0, Math.PI * 2);
    ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();
  },
  supply: (ctx, size) => {
    // A crate with a cross brace.
    const pad = size * 0.2;
    ctx.lineWidth = size * 0.08;
    ctx.strokeRect(pad, pad, size - 2 * pad, size - 2 * pad);
    ctx.beginPath();
    ctx.moveTo(pad, pad);
    ctx.lineTo(size - pad, size - pad);
    ctx.moveTo(size - pad, pad);
    ctx.lineTo(pad, size - pad);
    ctx.stroke();
  },
};

function signTexture(config: BuildingConfig): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = config.signColor;
    ctx.beginPath();
    ctx.roundRect(4, 4, size - 8, size - 8, 24);
    ctx.fill();
    ctx.fillStyle = '#2A2233';
    ctx.strokeStyle = '#2A2233';
    ICONS[config.id](ctx, size);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createBuilding(config: BuildingConfig): Group {
  const group = new Group();
  const width = config.lastCol - config.firstCol + 0.6;
  const center = (config.firstCol + config.lastCol) / 2;

  const body = new Mesh(new BoxGeometry(width, HEIGHT, 1.6), toon({ color: config.color }));
  body.position.set(0, HEIGHT / 2, 0);
  body.castShadow = true;
  body.receiveShadow = true;

  const roof = new Mesh(new ConeGeometry(width * 0.78, 1.1, 4, 1), toon({ color: '#4A3B52' }));
  roof.castShadow = true;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.6);
  roof.position.set(0, HEIGHT + 0.55, 0);

  const door = new Mesh(new PlaneGeometry(0.7, 1.05), toon({ color: '#3A2E2A' }));
  door.position.set(0, 0.53, 0.81);

  const sign = new Mesh(
    new PlaneGeometry(0.85, 0.85),
    new MeshBasicMaterial({ map: signTexture(config) }),
  );
  sign.position.set(0, HEIGHT - 0.55, 0.82);

  group.add(body, roof, door, sign);
  group.position.set(center, GROUND, DEPTH);
  return group;
}

/** The town: four low-poly buildings on the plateau, each with a lit sign (§7, §8). */
export function createBuildings(): Group {
  const town = new Group();
  for (const building of BUILDINGS) town.add(createBuilding(building));
  return town;
}
