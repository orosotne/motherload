import { ECONOMY } from '../data/economy';
import { UPGRADE_BRANCHES, type UpgradeBranch } from '../data/upgrades';
import { decimal, money, t, type TextKey } from '../i18n';
import { repair, repairQuote } from '../sim/economy';
import { tierValue } from '../sim/stats';
import { buyUpgrade, maxTier, upgradeQuote } from '../sim/upgrades';
import { UPGRADE_ICONS } from './icons';
import type { PanelAction } from './panel';
import type { ShopContent, ShopContext } from './shops';

/** Digits shown per branch: the drill has hundredths of a second, the engine halves. */
const DIGITS: Readonly<Record<UpgradeBranch, number>> = {
  drill: 2,
  hull: 0,
  engine: 1,
  tank: 0,
  cooling: 0,
  cargo: 0,
  light: 0,
};

export function upgradeName(branch: UpgradeBranch): string {
  return t(`upgrade.${branch}` as TextKey);
}

/** A branch's value with its unit, e.g. "0.48 s/block" or "do 1 250 m". */
export function upgradeValue(branch: UpgradeBranch, value: number): string {
  return t(`upgrade.${branch}.unit` as TextKey, { value: decimal(value, DIGITS[branch]) });
}

function repairAction({ state, events, note }: ShopContext): PanelAction {
  const quote = repairQuote(state);
  return {
    label: t('workshop.repair'),
    sub: `${state.hull} → ${state.stats.maxHull} HP`,
    detail: quote.hp > 0 ? money(quote.cost) : '',
    disabled: quote.hp === 0 || state.cash < ECONOMY.repairPricePerHp,
    run: () => {
      const result = repair(state, events);
      note.text = t('workshop.repaired', { hp: result.hp, cost: money(result.cost) });
    },
  };
}

/** One card per branch with "now → after" and the price (§8). */
function upgradeCard({ state, events, note }: ShopContext, branch: UpgradeBranch): PanelAction {
  const quote = upgradeQuote(state, branch);
  const tier = state.tiers[branch];
  const name = upgradeName(branch);
  return {
    label: name,
    icon: UPGRADE_ICONS[branch],
    pips: { filled: tier + 1, total: maxTier(branch) + 1 },
    sub: quote
      ? `${upgradeValue(branch, quote.now)} → ${upgradeValue(branch, quote.next)}`
      : `${upgradeValue(branch, tierValue(branch, tier))} · ${t('workshop.max')}`,
    detail: quote ? money(quote.price) : '',
    disabled: !quote || state.cash < quote.price,
    run: () => {
      if (quote && buyUpgrade(state, branch, events)) {
        note.text = t('workshop.bought', { name, tier: quote.tier + 1 });
      }
    },
  };
}

/** Gus's Workshop: repairs and the seven upgrade branches (§6). */
export function workshop(context: ShopContext): ShopContent {
  const { state, note } = context;
  const quote = repairQuote(state);
  let fallback = '';
  if (quote.hp === 0) fallback = t('workshop.noRepair');
  else if (state.cash < ECONOMY.repairPricePerHp) fallback = t('workshop.broke');
  return {
    line: t('workshop.greeting', { hull: state.hull, max: state.stats.maxHull }),
    note: note.text || fallback,
    layout: 'grid',
    actions: [repairAction(context), ...UPGRADE_BRANCHES.map((b) => upgradeCard(context, b))],
  };
}
