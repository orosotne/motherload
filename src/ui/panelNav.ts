export type Direction = 'up' | 'down' | 'left' | 'right';

function centre(rect: DOMRect): [number, number] {
  return [rect.left + rect.width / 2, rect.top + rect.height / 2];
}

/**
 * The button to focus next (§8): the nearest enabled one in `direction`, favouring those in
 * line with the current one. In a single column left and right step through the list like up
 * and down; off an edge the focus wraps around. −1 when there is nothing to move to.
 */
export function nextButton(
  buttons: readonly HTMLButtonElement[],
  from: number,
  direction: Direction,
): number {
  const rect = buttons[from]?.getBoundingClientRect();
  if (!rect) return -1;
  const [fx, fy] = centre(rect);
  let best = -1;
  let bestScore = Infinity;
  buttons.forEach((button, index) => {
    if (button.disabled || index === from) return;
    const [x, y] = centre(button.getBoundingClientRect());
    const along = { up: fy - y, down: y - fy, left: fx - x, right: x - fx }[direction];
    const across = direction === 'up' || direction === 'down' ? Math.abs(x - fx) : Math.abs(y - fy);
    if (along <= 1) return;
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  if (best >= 0) return best;
  if (direction === 'left' || direction === 'right') {
    return nextButton(buttons, from, direction === 'left' ? 'up' : 'down');
  }
  const enabled = buttons.flatMap((button, index) => (button.disabled ? [] : [index]));
  return (direction === 'down' ? enabled[0] : enabled[enabled.length - 1]) ?? -1;
}
