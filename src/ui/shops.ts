import type { EventBus } from '../core/events';
import { BUILDINGS, type BuildingId } from '../data/buildings';
import { ECONOMY } from '../data/economy';
import { MINERALS } from '../data/minerals';
import { decimal, money, t, type TextKey } from '../i18n';
import { cargoUnits, cargoValue } from '../sim/cargo';
import { refuel, refuelOffer, refuelQuote, sellAll } from '../sim/economy';
import type { GameEvents } from '../sim/events';
import type { GameState } from '../sim/game';
import type { PanelView } from './panel';
import { PORTRAITS } from './portraits';
import { supplyDepot } from './supply';
import { workshop } from './workshop';

/** A shop's part of the panel; the title and colour come from the building. */
export type ShopContent = Omit<PanelView, 'title' | 'color'>;

export interface ShopContext {
  state: GameState;
  events: EventBus<GameEvents>;
  /** Feedback line, kept between redraws of the panel. */
  note: { text: string };
  /** Mira keeps the Album of relics (§7). */
  openAlbum?: () => void;
}

function fuelStation({ state, events, note }: ShopContext): ShopContent {
  const quote = refuelQuote(state);
  const offer = refuelOffer(state);
  const full = quote.liters < 0.05;
  const broke = !full && !offer.free && offer.affordable < 0.05;
  let fallback = '';
  if (full) fallback = t('fuel.full');
  else if (broke) fallback = t('fuel.broke');
  return {
    line: t('fuel.greeting', { fuel: decimal(state.fuel), tank: state.stats.tankLiters }),
    note: note.text || fallback,
    actions: [
      {
        label: t('fuel.fill'),
        detail: full ? '' : offer.free ? t('fuel.freeTag') : money(quote.cost),
        disabled: full || broke,
        run: () => {
          const result = refuel(state, events);
          note.text = result.free
            ? t('fuel.free')
            : t('fuel.bought', { liters: decimal(result.liters), cost: money(result.cost) });
        },
      },
    ],
  };
}

function cargoList(state: GameState): HTMLElement {
  const list = document.createElement('ul');
  list.className = 'cargo-list';
  for (const mineral of MINERALS) {
    const units = state.cargo[mineral.id] ?? 0;
    if (units === 0) continue;
    const item = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = mineral.color;
    const name = document.createElement('span');
    name.textContent = `${t(mineral.key as TextKey)} × ${units}`;
    const value = document.createElement('span');
    value.textContent = money(units * mineral.value * ECONOMY.sellShare);
    item.append(swatch, name, value);
    list.append(item);
  }
  if (list.children.length > 0) {
    const total = document.createElement('li');
    total.className = 'total';
    const label = document.createElement('span');
    label.textContent = t('buyer.total');
    const value = document.createElement('span');
    value.textContent = money(cargoValue(state.cargo) * ECONOMY.sellShare);
    total.append(document.createElement('span'), label, value);
    list.append(total);
  }
  return list;
}

function buyer({ state, events, note, openAlbum }: ShopContext): ShopContent {
  const units = cargoUnits(state.cargo);
  const relics = state.relics.filter(Boolean).length;
  return {
    line: units > 0 ? t('buyer.greeting') : t('buyer.empty'),
    body: cargoList(state),
    note: note.text,
    actions: [
      {
        label: t('buyer.sellAll'),
        detail: units > 0 ? money(cargoValue(state.cargo) * ECONOMY.sellShare) : '',
        disabled: units === 0,
        run: () => {
          const result = sellAll(state, events);
          note.text = t('buyer.sold', { units: result.units, value: money(result.value) });
        },
      },
      {
        label: t('buyer.album'),
        detail: `${relics} / ${state.relics.length}`,
        run: () => openAlbum?.(),
      },
    ],
  };
}

/** Pip runs the fuel station, Mira the exchange and Gus the workshop (§7). */
const OWNERS: Partial<Record<BuildingId, string>> = {
  fuel: PORTRAITS.pip,
  buyer: PORTRAITS.mira,
  workshop: PORTRAITS.gus,
};

/** The panel of a surface building, drawn from the current state (§3, §6). */
export function shopView(id: BuildingId, context: ShopContext): PanelView {
  const building = BUILDINGS.find((candidate) => candidate.id === id);
  const content = {
    fuel: fuelStation,
    buyer,
    workshop,
    supply: supplyDepot,
  }[id](context);
  return {
    title: building ? t(building.key as TextKey) : id,
    color: building?.signColor ?? '#ffffff',
    portrait: OWNERS[id],
    ...content,
  };
}
