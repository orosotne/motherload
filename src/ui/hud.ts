import { FUEL } from '../data/economy';
import { decimal, money, onLanguageChange, t, type TextKey } from '../i18n';
import { buildingAt, depthMeters } from '../sim/buildings';
import { cargoUnits } from '../sim/cargo';
import type { GameState } from '../sim/game';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  parent?.append(node);
  return node;
}

interface Gauge {
  root: HTMLElement;
  label: HTMLElement;
  value: HTMLElement;
  fill: HTMLElement;
}

function gauge(parent: HTMLElement, kind: string): Gauge {
  const root = element('div', `hud-gauge is-${kind}`, parent);
  const head = element('div', 'hud-gauge-label', root);
  const label = element('span', '', head);
  const value = element('b', '', head);
  const fill = element('div', 'hud-bar-fill', element('div', 'hud-bar', root));
  return { root, label, value, fill };
}

function stat(parent: HTMLElement): { root: HTMLElement; label: HTMLElement; value: HTMLElement } {
  const root = element('div', 'hud-stat', parent);
  return { root, label: element('span', '', root), value: element('b', '', root) };
}

/**
 * HUD at the top left (GAME_SPEC §8): a big fuel gauge, hull, cargo x/y, depth in metres and
 * cash. Critical values pulse. Writes to the DOM only when a shown value changes.
 */
export class Hud {
  private readonly fuel: Gauge;
  private readonly hull: Gauge;
  private readonly cargo: ReturnType<typeof stat>;
  private readonly depth: ReturnType<typeof stat>;
  private readonly zone: ReturnType<typeof stat>;
  private readonly cash: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly promptText: HTMLElement;
  private readonly shown = new Map<HTMLElement, string>();

  constructor(parent: HTMLElement) {
    const root = element('div', 'hud', parent);
    this.fuel = gauge(root, 'fuel');
    this.hull = gauge(root, 'hull');
    const stats = element('div', 'hud-stats', root);
    this.cargo = stat(stats);
    this.depth = stat(stats);
    this.zone = stat(stats);
    this.cash = element('div', 'hud-cash', root);

    this.prompt = element('div', 'prompt', parent);
    const key = element('kbd', '', this.prompt);
    key.textContent = 'E';
    this.promptText = element('span', '', this.prompt);
    this.prompt.hidden = true;

    this.relabel();
    onLanguageChange(() => {
      this.shown.clear();
      this.relabel();
    });
  }

  update(state: GameState): void {
    const { stats } = state;
    const fuelShare = state.fuel / stats.tankLiters;
    this.write(this.fuel.value, t('unit.liters', { value: decimal(state.fuel) }));
    this.fuel.fill.style.width = `${Math.max(fuelShare, 0) * 100}%`;
    this.fuel.root.classList.toggle(
      'is-low',
      fuelShare <= FUEL.warnShare && fuelShare > FUEL.criticalShare,
    );
    this.fuel.root.classList.toggle('is-critical', fuelShare <= FUEL.criticalShare);

    const hullShare = state.hull / stats.maxHull;
    this.write(this.hull.value, `${state.hull} / ${stats.maxHull}`);
    this.hull.fill.style.width = `${hullShare * 100}%`;
    this.hull.root.classList.toggle('is-critical', hullShare <= 0.25);

    const units = cargoUnits(state.cargo);
    this.write(this.cargo.value, `${units} / ${stats.cargoCapacity}`);
    this.cargo.root.classList.toggle('is-full', units >= stats.cargoCapacity);
    this.write(this.depth.value, t('unit.meters', { value: depthMeters(state.pod) }));
    this.write(this.zone.value, String(state.zone));
    this.write(this.cash, money(state.cash));

    const building = state.status.kind === 'play' ? buildingAt(state.pod) : null;
    this.prompt.hidden = !building;
    if (building) this.write(this.promptText, t(building.key as TextKey));
  }

  /** Labels that only change with the language; values refresh on the next update. */
  private relabel(): void {
    this.fuel.label.textContent = t('hud.fuel');
    this.hull.label.textContent = t('hud.hull');
    this.cargo.label.textContent = t('hud.cargo');
    this.depth.label.textContent = t('hud.depth');
    this.zone.label.textContent = t('hud.zone');
  }

  private write(node: HTMLElement, text: string): void {
    if (this.shown.get(node) === text) return;
    this.shown.set(node, text);
    node.textContent = text;
  }
}
